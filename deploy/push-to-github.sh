#!/usr/bin/env bash
# دفع المشروع إلى مستودع GitHub خاص بك، ثم اربطه بـ Vercel.
# الاستخدام: GH_USER=asim1417 REPO=medkey-gulf bash deploy/push-to-github.sh
set -e
: "${GH_USER:?ضع اسم مستخدم GitHub}"; : "${REPO:?ضع اسم المستودع}"
git init -b main
git add -A
git commit -m "MedKey Gulf — initial platform"
git remote add origin "https://github.com/${GH_USER}/${REPO}.git"
echo "أنشئ المستودع الفارغ على GitHub ثم نفّذ: git push -u origin main"
echo "بعدها: vercel.com → Import Project → اختر المستودع → أضِف متغيرات البيئة."
