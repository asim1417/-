import streamlit as st
import easyocr
import tempfile
import fitz  # PyMuPDF
import os

# إعداد القارئ
reader = easyocr.Reader(['ar'])

st.set_page_config(page_title="محول الأحكام القضائية - OCR", layout="centered")
st.title("📄 محول الأحكام القضائية إلى نص")
st.markdown("قم برفع ملف PDF وسنقوم بتحويله إلى نص قابل للنسخ باستخدام تقنية EasyOCR")

uploaded_file = st.file_uploader("🔼 ارفع ملف PDF", type=["pdf"])

if uploaded_file:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        tmp_file.write(uploaded_file.read())
        tmp_path = tmp_file.name

    full_text = ""
    doc = fitz.open(tmp_path)
    num_pages = len(doc)

    with st.spinner("🔍 جاري استخراج النص من الصفحات..."):
        for i, page in enumerate(doc):
            pix = page.get_pixmap(dpi=300)
            img_path = f"page_{i}.png"
            pix.save(img_path)

            result = reader.readtext(img_path, detail=0, paragraph=True)
            full_text += "\n".join(result) + "\n\n"

            os.remove(img_path)

    st.success("✅ تم استخراج النص بنجاح")
    st.text_area("📋 النص المستخرج:", full_text, height=400)

    if st.button("📥 تحميل النص"):
        st.download_button(
            label="⬇️ تحميل الملف النصي",
            data=full_text,
            file_name="ocr_output.txt",
            mime="text/plain"
        )

    os.remove(tmp_path)
