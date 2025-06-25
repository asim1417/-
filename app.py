import streamlit as st
import fitz  # PyMuPDF
import easyocr
import time

st.set_page_config(page_title="محول الأحكام القضائية - OCR", layout="centered")
st.title("📄 محول الأحكام القضائية إلى نص 🧠")
st.markdown("قم برفع ملف PDF وسنقوم بتحويله إلى نص قابل للنسخ (OCR) باستخدام EasyOCR")

uploaded_file = st.file_uploader("🔼 ارفع ملف PDF", type=["pdf"])

if uploaded_file:
    with open("temp.pdf", "wb") as f:
        f.write(uploaded_file.read())

    with st.spinner("⏳ جاري المعالجة..."):
        start_time = time.time()
        doc = fitz.open("temp.pdf")
        reader = easyocr.Reader(['ar'])

        all_text = ""
        for page_number in range(len(doc)):
            page = doc.load_page(page_number)
            pix = page.get_pixmap(dpi=300)
            image_bytes = pix.tobytes("png")
            result = reader.readtext(image_bytes, detail=0, paragraph=True)
            all_text += "\n".join(result) + "\n\n"

        elapsed = time.time() - start_time

    st.success(f"✅ تمت المعالجة في {elapsed:.2f} ثانية")
    st.text_area("📋 النص المستخرج:", all_text, height=400)

    st.download_button(
        label="⬇️ تحميل الملف النصي",
        data=all_text,
        file_name="ocr_output.txt",
        mime="text/plain"
    )
