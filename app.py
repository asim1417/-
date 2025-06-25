import streamlit as st
import pytesseract
from PIL import Image
import fitz  # PyMuPDF
import time
import os

# إعداد Tesseract
pytesseract.pytesseract.tesseract_cmd = "/usr/bin/tesseract"

# إعداد صفحة التطبيق
st.set_page_config(page_title="محول الأحكام القضائية - OCR", layout="centered")

st.title("📄 محول الأحكام القضائية إلى نص 🧠")
st.markdown("قم برفع ملف PDF وسنقوم بتحويله إلى نص قابل للنسخ (OCR)")

uploaded_file = st.file_uploader("🔼 ارفع ملف PDF", type=["pdf"])

def pdf_to_images(pdf_path):
    doc = fitz.open(pdf_path)
    images = []
    for page in doc:
        pix = page.get_pixmap(dpi=300)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        images.append(img)
    return images

if uploaded_file is not None:
    with st.spinner("⏳ جاري تحويل الملف إلى صور..."):
        with open("temp.pdf", "wb") as f:
            f.write(uploaded_file.read())

        start_time = time.time()
        images = pdf_to_images("temp.pdf")
        elapsed = time.time() - start_time
        st.success(f"✅ تم تحويل PDF إلى صور في {elapsed:.2f} ثانية")

        full_text = ""
        st.info("📖 جاري قراءة النص من الصفحات...")

        for i, img in enumerate(images):
            with st.spinner(f"📄 معالجة الصفحة {i+1}/{len(images)}..."):
                text = pytesseract.image_to_string(img, lang="ara")
                full_text += text + "\n\n"

        st.success("✅ تم استخراج النص بنجاح")
        st.text_area("📋 النص المستخرج:", full_text, height=400)

        if st.button("📥 تحميل النص كملف .txt"):
            with open("ocr_output.txt", "w", encoding="utf-8") as f:
                f.write(full_text)
            st.download_button(
                label="⬇️ تحميل الملف النصي",
                data=full_text,
                file_name="ocr_output.txt",
                mime="text/plain"
            )

        st.caption("🛡️ جميع المعالجة تتم داخل المتصفح باستخدام Tesseract OCR")
