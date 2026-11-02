# Frontend Questions: Al-Rahma Medical Complex

Source: client requirements from Dr. Saad Al-Haidari, dated 31-10-2026.
My role: frontend only. The team also has backend and DevOps.

## الأسئلة بالعربي (جاهزة للإرسال)

### لقائد الفريق

1. أكو تصميم جاهز (Figma)؟ وإذا ماكو، منو يقرر الشكل؟ وأكو شعار وألوان وخطوط للمجمع؟
2. موعد التسليم يوم 7-11 لو بعده؟
3. أي شاشات أبدي بيها، ولأي مستخدمين بالنسخة الأولى؟
4. واجهة المريض وواجهة الموظفين مختلفة. نسويها بمشروع Next.js واحد لو مشروعين؟
5. نستخدم TypeScript؟ وأي مكتبات معتمدة للتصميم والترجمة والنماذج وجلب البيانات؟
6. هل المطلوب موقع يشتغل زين على الجوال فقط، لو نحتاج PWA؟ وأي أجهزة ومتصفحات لازم ندعمها؟
7. العربي والإنكليزي والوضع الليلي لازم تكون جاهزة بالنسخة الأولى؟
8. أكو مكونات من مشاريع سابقة أقدر أستخدمها؟
9. الفرونت إند يبقى بمستودعي الشخصي `aljumaily1212/project-1` لو ينتقل لحساب الشركة؟ وشنو طريقة الفروع والـ Pull Requests، ومنو يراجع الكود؟
10. شنو ردود الزبون على هذي النقاط اللي تأثر على الشاشات: مدة إلغاء الموعد، عدد مرات عدم الحضور قبل طلب الدفع المقدم، صلاحية الوصفة، ومنو يحدد الحالة الطارئة؟

### للباك إند

11. وين توثيق الـ API (Swagger أو Postman)؟ وأي واجهات تجهز أول ومتى؟
12. لحد ما يجهز الـ API، نتفق على شكل البيانات حتى أشتغل ببيانات وهمية؟
13. تسجيل الدخول شلون يشتغل: الحقول المطلوبة، Token لو Cookie، وشلون أعرف دور المستخدم؟
14. الحقول الممنوعة، مثل ملاحظات الطبيب الداخلية، ما توصل أصلاً من الـ API للمستخدم اللي مو من حقه يشوفها؟
15. إذا الموعد انحجز قبل ما المريض يأكد، شنو رمز الخطأ والرسالة اللي ترجع حتى أعرضها؟
16. شاشة الطابور تتحدث شلون: WebSocket لو SSE لو أطلب البيانات كل كم ثانية؟
17. شنو شكل رسائل الخطأ؟ وهي تجي بالعربي والإنكليزي لو الترجمة عليّ؟
18. شلون تجي القوائم الطويلة (pagination والبحث)؟ وبأي صيغة تجي التواريخ والمبالغ؟
19. الدفع الإلكتروني شلون يشتغل بالواجهة؟ تحويل لصفحة البوابة لو داخل الموقع؟ وشلون أعرض حالة الدفع؟
20. إذا النظام لقى ملف مكرر للمريض، شنو يرجع الـ API حتى أعرض تحذير للموظف؟
21. شلون أرفع وأعرض ملفات PDF وصور الأشعة؟
22. عند انقطاع النت عند الاستقبال، شنو المطلوب من الواجهة؟ نخزن العمليات ونرسلها بعدين، لو نعرض البيانات فقط؟

### للـ DevOps

23. وين ينرفع الفرونت إند، وهل يدعم Next.js بالكامل (SSR)؟ ومنو يكتب Dockerfile إذا نحتاجه؟
24. شنو رابط الـ API للتطوير والـ staging؟ وشنو متغيرات البيئة اللي أحتاجها؟
25. الفرونت والـ API على نفس الدومين؟ وCORS والكوكيز مضبوطة؟
26. أكو CI/CD ورابط تجريبي لكل Pull Request؟
27. الملفات والصور من أي دومين تجي حتى أضيفه بإعدادات Next.js؟

## English version

### Team leader

1. Is there a ready design in Figma? If not, who decides the look? Is there a logo, brand colors and fonts?
2. Is delivery on 7-11 or later?
3. Which screens do I start with, and for which users in version one?
4. The patient and staff interfaces look different. Should they be one Next.js project or two?
5. Do we use TypeScript? Which libraries are approved for UI, translation, forms and data fetching?
6. Is a mobile-friendly website enough, or do we need a PWA? Which devices and browsers must we support?
7. Must Arabic, English and dark mode be ready in version one?
8. Are there components from earlier projects I can reuse?
9. Does the frontend stay in my personal repo, `aljumaily1212/project-1`, or move to the company account? What is the branch and pull request workflow, and who reviews my code?
10. What has the client decided on the points that affect the screens: the cancellation window, the no-show limit before a deposit, prescription expiry, and who marks a case as an emergency?

### Backend

11. Where is the API documentation (Swagger or Postman)? Which endpoints come first, and when?
12. Until the API is ready, can we agree on the data shapes so I can build on mock data?
13. How does login work: the required fields, token or cookie, and how do I get the user's role?
14. Are restricted fields, like the doctor's internal notes, left out of the API response for users who must not see them?
15. If a slot is taken before the patient confirms, which error code and message come back so I can show them?
16. How does the queue screen update: WebSocket, SSE or polling?
17. What is the error format? Do messages come in Arabic and English, or do I translate them?
18. How do long lists work (pagination and search)? What format do dates and amounts use?
19. How does online payment work in the UI: a redirect to the gateway or inside the site? How do I show payment status?
20. If a duplicate patient record is found, what does the API return so I can warn the employee?
21. How do I upload and display PDF files and X-ray images?
22. When the internet drops at reception, what must the UI do: save actions and send them later, or only show existing data?

### DevOps

23. Where is the frontend hosted, and does it fully support Next.js (SSR)? Who writes the Dockerfile if we need one?
24. What are the API URLs for development and staging? Which environment variables do I need?
25. Are the frontend and API on the same domain? Are CORS and cookies set up?
26. Is there CI/CD, with a preview link for each pull request?
27. Which domain do files and images come from, so I can add it to the Next.js config?
