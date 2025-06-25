import streamlit as st
from pdf2image import convert_from_path
import pytesseract
from PIL import Image
import time
import os

# إعداد tesseract
pytesseract.pytesseract.tesseract_cmd = "/usr/bin/tesseract"

# إعداد واجهة التطبيق
st.set_page_config(page_title="محول الأحكام القضائية - OCR", layout="centered")

st.title("📄 محول الأحكام القضائية إلى نص 🧠")
st.markdown("قم برفع ملف PDF وسنقوم بتحويله إلى نص قابل للنسخ (OCR)")

uploaded_file = st.file_uploader("🔼 ارفع ملف PDF", type=["pdf"])

if uploaded_file is not None:
    with st.spinner("⏳ جاري تحويل الملف إلى صور..."):
        with open("temp.pdf", "wb") as f:
            f.write(uploaded_file.read())

        start_time = time.time()
        images = convert_from_path("temp.pdf")
        elapsed = time.time() - start_time
        st.success(f"✅ تم التحويل في {elapsed:.2f} ثانية")

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

        st.caption("جميع المعالجة تتم داخل المتصفح باستخدام Tesseract OCR")

