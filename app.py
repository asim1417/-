import streamlit as st
import easyocr
import tempfile
import os

# إعداد الواجهة
st.set_page_config(page_title="محول الأحكام القضائية", layout="centered")
st.title("📄 محول الأحكام القضائية إلى نص 🧠")
st.markdown("قم برفع ملف PDF (صفحة واحدة أو أكثر) وسنقوم بتحويله إلى نص قابل للنسخ باستخدام OCR")

uploaded_file = st.file_uploader("🔼 ارفع ملف PDF", type=["pdf"])

if uploaded_file:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        tmp_file.write(uploaded_file.read())
        tmp_path = tmp_file.name

    st.info("📖 جاري استخراج الصور من صفحات PDF...")

    from pdf2image import convert_from_path
    try:
        images = convert_from_path(tmp_path)
    except Exception as e:
        st.error("⚠️ تعذر تحويل PDF إلى صور. تأكد من أن الملف سليم وأن النظام يدعم Poppler.")
        st.stop()

    reader = easyocr.Reader(['ar'], gpu=False)

    full_text = ""
    for i, image in enumerate(images):
        st.info(f"🔍 معالجة الصفحة {i+1} من {len(images)}...")
        result = reader.readtext(image, detail=0, paragraph=True)
        page_text = "\n".join(result)
        full_text += f"صفحة {i+1}:\n{page_text}\n\n"

    st.success("✅ تم استخراج النص بنجاح")
    st.text_area("📋 النص المستخرج:", full_text, height=400)

    st.download_button(
        label="⬇️ تحميل الملف النصي",
        data=full_text,
        file_name="ocr_output.txt",
        mime="text/plain"
    )

    st.caption("جميع المعالجة تتم باستخدام مكتبة EasyOCR وداخل الخادم.")

