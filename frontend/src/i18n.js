import React, { createContext, useContext, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// ملف الترجمة المركزي (i18n) — كل نصوص واجهة التطبيق مُعرَّفة هنا في مكان واحد فقط.
// لإضافة لغة جديدة لاحقاً (فرنسية، إسبانية...): أضف مفتاحاً جديداً هنا (مثلاً "fr")
// بنفس بنية "en"/"ar" بالضبط (نفس المفاتيح بالضبط)، وستظهر تلقائياً كخيار جديد
// في زر تبديل اللغة دون أي تعديل آخر في الكود.
//
// تنبيه مهم: هذا الملف يتحكم فقط بلغة *واجهة* التطبيق (الأزرار، التسميات، رسائل
// التحقق...). لغة *المحتوى* الذي يولّده Claude (الفكرة، الكابشن، الهاشتاغات...)
// منفصلة عنه تماماً ولا علاقة لها بهذا الملف — يكتب المستخدم وصف مشروعه بأي لغة
// يريدها في حقل النص الحر، والخادم (backend/server.js) يطلب من Claude الرد بنفس
// لغة ذلك الوصف بغض النظر عن لغة الواجهة المختارة هنا.
// ---------------------------------------------------------------------------

export const translations = {
  en: {
    app: {
      title: "Apex Digital Agency",
      subtitle: "Bespoke marketing campaigns, crafted by senior strategists",
      loading: "Loading...",
      logout: "Log out",
      myProjects: "My Projects",
      statusOnline: "Agency Strategy Team: Online",
      planBadge: "Plan: {plan}",
      daysLabel: "Days: {days}",
      planLimitNote:
        "Your current plan limit ({plan}): {maxDays} day(s), {maxGenerations} deliverable(s)/month.",
      describeLabel: "Tell us about your business",
      describePlaceholder: "e.g., I run an online store selling organic skincare products.",
      describeRequired:
        "This field is required — describe your business in a sentence or two so our strategists can craft a tailored recommendation.",
      generateBtn: "Commission Campaign Strategy",
      generating: "Preparing your strategy...",
      quotaUsed: "Deliverables commissioned this month: {used} of {max} ({plan} plan)",
      outputHeading: "Campaign Deliverables & Content Strategy",
      loadingStep1: "Strategy Directors are analyzing your market positioning...",
      loadingStep2: "Senior Copywriters are drafting your campaign hooks...",
      loadingStep3: "Creative Leads are refining tone and engagement tactics...",
      loadingStep4: "Finalizing your bespoke marketing deliverables...",
      alertDescribeFirst: "Please describe your business before commissioning your campaign strategy.",
      alertGenericError: "An error occurred while preparing your campaign materials.",
      alertBackendDown: "Could not reach the agency server. Make sure it's running.",
      alertLoginRequiredForUpgrade: "Please log in before upgrading your plan.",
      alertCheckoutUrlMissing: "The checkout link isn't configured yet. Please contact support.",
    },
    plans: { free: "Strategic Consultation", pro: "Boutique Campaign", premium: "Full Agency Retainer" },
    tiers: { free: "Strategic Consultation", pro: "Boutique Campaign", premium: "Full Agency Retainer" },
    common: { upgrade: "Upgrade", dayLabel: "Day {n}" },
    content: {
      bestTime: "Best time to post: {time}",
      imageIdea: "Image suggestion: {value}",
      video: "Video: {value}",
    },
    pro: {
      languageLabel: "Content language",
      languageAuto: "Auto-detect (same as description)",
      sourceTextLabel: "Content repurposing (optional)",
      sourceTextPlaceholder:
        "Paste an article, blog post, or video script here to turn it into social posts...",
      downloadCsv: "Download as CSV",
      imagePrompt: "Creative direction: {value}",
      toneLabel: "Tone of voice",
      toneAuto: "Auto (Expert Selection)",
      toneOptions: {
        professional: "Professional",
        friendly: "Friendly & casual",
        humorous: "Humorous & fun",
        luxury: "Luxury & premium",
        inspirational: "Inspirational",
        bold: "Bold & direct",
      },
      goalLabel: "Content goal",
      goalAuto: "Auto (Expert Selection)",
      goalOptions: {
        sales: "Increase sales",
        engagement: "Boost engagement",
        awareness: "Build brand awareness",
        education: "Educate the audience",
        promotion: "Promote an offer or event",
      },
      platformLabel: "Target platform",
      platformAuto: "Auto (Expert Selection)",
      platformOptions: {
        instagram: "Instagram",
        facebook: "Facebook",
        tiktok: "TikTok",
        linkedin: "LinkedIn",
        twitter: "X (Twitter)",
      },
      visualStyleLabel: "Visual Direction 👑",
      visualStyleAuto: "Auto (Expert Selection)",
      visualStyleOptions: {
        realPhotography: "Real Photography",
        minimalistGraphics: "Minimalist Graphics",
        ugcReels: "UGC / Reels Style",
        threeDRenders: "3D Renders",
      },
    },
    planFeatures: {
      free: { emoji: "✅", label: "Strategic Consultation:", description: "A complimentary preview of your custom campaign direction." },
      // pro/premium: "features" مصفوفة تُعرَض كبطاقة مبنية ببنود واضحة (راجع App.js، قسم
      // "Luxury Structured Tier Cards"). بنية "Weekly Sprint": كل حملة/سبرنت أسبوعي بحد أقصى
      // 7 أيام (وليس مخططاً متصلاً لمدة 30/90 يوماً كما كان سابقاً)، تتكرر عدة مرات شهرياً
      // (5 مرات لـ Pro، 12 مرة لـ Premium) لتغطية الشهر كاملاً. الأرقام هنا (7 أيام/سبرنت،
      // 5 أو 12 سبرنت/شهر) مطابقة تماماً لـ PLAN_LIMITS.pro/premium في backend/server.js
      // (maxDays:7 للاثنين، maxGenerationsPerMonth:5/12) ولـ PLAN_MAX_DAYS/PLAN_MAX_GENERATIONS
      // في frontend/src/App.js. نص وصفي بحت، لا يغيّر أي منطق أو حد فعلي في التطبيق. كل بند
      // يبدأ بعلامة "✦" ذهبية مضمَّنة في النص نفسه (بدل رسمها منفصلة في App.js كما كان سابقاً
      // مع ◆)، ويُعرض بلونها الذهبي عبر تقسيم النص في App.js (renderBulletFeature).
      pro: {
        label: "Boutique Campaign:",
        features: [
          "✦ Full Month Coverage: 5 Weekly Sprints (Up to 7 days each)",
          "✦ Multi-Language Support",
          "✦ CSV Strategy Export",
        ],
      },
      premium: {
        label: "Full Agency Retainer:",
        features: [
          "✦ 360° Monthly Coverage: 12 Sprints (Up to 7 days each)",
          "✦ Omnichannel Strategy",
          "✦ Creative Direction & Repurposing",
        ],
      },
    },
    upsell: {
      free: {
        title: "🔒 Professional features locked",
        description:
          "Want to download this plan as an **Excel (CSV)** file and choose the **content language** that suits you?",
        button: "⭐ Upgrade to Boutique Campaign",
      },
      pro: {
        title: "🔒 Full-service creative locked",
        description:
          "Want our creative team to provide **Creative Direction** for each deliverable to guide professional visuals? Plus the **content repurposing** feature?",
        button: "🚀 Upgrade to Full Agency Retainer",
      },
    },
    free: {
      yourIdea: "Your custom idea",
      shotAngle: "Shot angle: {value}",
    },
    // تجربة الباقة المجانية التشويقية (Teaser) — تظهر مباشرة تحت المنشور الحقيقي الوحيد:
    // بطاقات هيكلية وهمية مموّهة (Skeleton) بقفل فوقها، ثم صندوق مقارنة تسويقي (القهوة).
    // بقصد: لا تُذكر كلمة "AI"/"الذكاء الاصطناعي" في أي من هذه النصوص عمداً.
    freeUpsell: {
      lockOverlayText:
        "We've already prepared the rest of your custom content plan. Upgrade your account to unlock every idea now.",
      unlockButton: "Unlock the Full Plan",
      coffee: {
        title: "Why your monthly subscription costs less than your coffee",
        description:
          "Your morning coffee costs you every single day, while a professional content strategy — delivered as weekly sprints all month long — saves you 30 hours of brainstorming for less.",
        cta: "Upgrade your account now to unlock the full plan and export it as a ready-to-use Excel file.",
        button: "Upgrade Now",
      },
      // شريط "الإفصاح الفاخر" (Executive Teaser Banner، Glassmorphism) — يظهر أعلى نتيجة
      // الباقة المجانية لضبط توقعات العميل بوضوح: badge = شارة قصيرة بارزة، body = الشرح.
      // كانا سابقاً جملة واحدة مدمجة (disclaimerBanner) — قُسّما هنا لبنيتين منفصلتين حتى
      // تُعرض الشارة كـ pill مستقلة بصرياً في App.js بدل الاعتماد على قص النص بفاصل " — ".
      disclaimer: {
        badge: "Preliminary Strategy Brief (Sample Preview)",
        body: "This outline is a simplified demonstration of our agency's methodology. Conversion-focused, omnichannel execution strategies are deployed exclusively within our Pro and Retainer tiers.",
      },
      // 3 بطاقات مقفلة تُعرض أسفل تقويم المحتوى المجاني — كل بطاقة تفتح نافذة VIP عند الضغط
      // عليها (setShowVipModal) بدل أي توجيه مباشر لصفحة دفع. كل الثلاث الآن لها شارة باقة.
      lockedCards: {
        sectionTitle: "Reserved for Pro & Agency Retainer Clients",
        conversionArchitecture: {
          title: "Conversion Architecture & High-Impact Ad Hooks",
          tier: "Pro",
        },
        competitorGap: {
          title: "Deep Competitor Psychology & Omnichannel Gap Analysis",
          tier: "Pro & Premium",
        },
        omnichannelGrowth: {
          title: "Omnichannel Growth Blueprint & Creative Repurposing",
          tier: "Premium",
        },
      },
    },
    // نافذة "VIP Lead Capture" — تظهر بدل التوجيه المباشر لصفحة الدفع (Lemon Squeezy) عند
    // النقر على أي زر ترقية. الهدف: تسجيل اهتمام العميل في Firestore (vip_leads) بدل بيعه
    // مباشرة، لأسباب تسويقية (نُدرة/طلب مرتفع). روابط Lemon Squeezy تبقى محفوظة في .env
    // لاستخدامها لاحقاً، دون حذفها.
    vip: {
      headline: "Exclusive Agency Access",
      body: "Thank you for your interest! Due to high demand, our premium agency retainers are currently at full capacity. Join our VIP waitlist to get priority access when a spot opens up.",
      button: "Join VIP Waitlist",
      sending: "Joining...",
      success: "You are on the list! Our strategy team will notify you soon.",
      closeBtn: "Close",
      submitError: "Something went wrong. Please try again in a moment.",
      loginRequired: "Please sign in first so we can add you to the VIP waitlist.",
    },
    footer: {
      affiliateLink: "Elite Partner Program",
    },
    ambassador: {
      headline: "Agency Ambassadors",
      body: "Earn a recurring 10% monthly commission for as long as your referred client stays subscribed. Join our VIP partner waitlist.",
      closeBtn: "Close",
    },
    auth: {
      loginTitle: "Log in",
      registerTitle: "Create a new account",
      loginSubtitle: "Welcome back! Log in to continue",
      registerSubtitle: "Create your account to get started",
      googleBtn: "Sign in with Google",
      or: "or",
      emailLabel: "Email address",
      passwordLabel: "Password",
      confirmPasswordLabel: "Confirm password",
      loginBtn: "Log in",
      createAccountBtn: "Create account",
      processing: "Processing...",
      haveAccount: "Already have an account?",
      loginLink: "Log in",
      noAccount: "Don't have an account?",
      registerLink: "Create one",
      errors: {
        fillAllFields: "Please fill in all fields.",
        invalidEmailFormat: "Please enter a valid email address (e.g. name@gmail.com).",
        passwordMismatch: "The passwords don't match.",
        passwordTooShort: "Password must be at least 6 characters.",
        default: "Something went wrong. Please try again.",
        "auth/email-already-in-use": "This email address is already in use.",
        "auth/invalid-email": "This email address is not valid.",
        "auth/weak-password": "This password is too weak (minimum 6 characters).",
        "auth/user-not-found": "No account was found with this email address.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/missing-password": "Please enter a password.",
        "auth/network-request-failed":
          "Could not connect to the server. Check your internet connection.",
        "auth/operation-not-allowed":
          "Email/password sign-in isn't enabled yet in this project's Firebase settings.",
        "auth/configuration-not-found":
          "The Authentication service isn't set up yet in the Firebase project (open the Authentication tab in the console and click Get started).",
        "auth/popup-blocked":
          "Your browser blocked the sign-in popup. Allow popups and try again.",
        "auth/account-exists-with-different-credential":
          "This email is already registered with a different sign-in method (e.g. a password).",
        "auth/unauthorized-domain":
          "This domain isn't authorized for Google sign-in. Add it in Firebase Console → Authentication → Settings → Authorized domains.",
      },
    },
    // رسائل أخطاء ديناميكية قادمة من الباكند (/api/generate-content و /api/micro-tool)،
    // مربوطة بكود الخطأ (errorCode) الذي يرسله الخادم بدل نص عربي ثابت — بهذا تظهر الرسالة
    // بنفس لغة الواجهة الحالية للمستخدم مهما كانت. راجع getBackendErrorMessage() في App.js.
    apiErrors: {
      SERVER_NOT_READY:
        "The server isn't ready to verify your account right now. Please try again in a moment.",
      AUTH_REQUIRED: "Please sign in before generating content.",
      DESCRIPTION_REQUIRED: "Please describe your business before commissioning your campaign strategy.",
      API_KEY_MISSING:
        "Our strategy service isn't configured on the server yet. Please contact support.",
      USER_NOT_FOUND: "We couldn't find your account profile. Try signing out and back in.",
      QUOTA_EXCEEDED:
        "You've used all your deliverables for this month on your {plan} plan ({max} deliverables/month). Your quota resets automatically next month, or you can upgrade for more.",
      GENERATION_FAILED:
        "Something went wrong while preparing your campaign materials. Please try again in a moment.",
      SAVE_FAILED:
        "Your campaign strategy was prepared but couldn't be saved. Please try again in a moment.",
      CORS_FORBIDDEN: "This request came from an unauthorized source.",
      default: "Something went wrong. Please try again.",
    },
    // شاشة "My Projects" (History.js) — سجل كل الدورات المحفوظة في Firestore لهذا المستخدم.
    history: {
      pageTitle: "My Projects",
      backToApp: "Back to Dashboard",
      loading: "Loading your projects...",
      empty: "You haven't commissioned any campaigns yet.",
      emptyCta: "Commission your first campaign strategy",
      loadError: "Couldn't load your projects. Please try again.",
      deleteError: "Couldn't delete this project. Please try again.",
      confirmDelete: "Are you sure you want to delete this project? This cannot be undone.",
      deleting: "Deleting...",
      noDescription: "(No description)",
      daysLabel: "Days: {days}",
      postsLabel: "Posts: {count}",
      planLabel: "Plan: {plan}",
      viewBtn: "View",
      editBtn: "Edit",
      exportBtn: "Export CSV",
      deleteBtn: "Delete",
      comingSoon: "Coming soon",
      modalTitle: "Project Details",
      closeBtn: "Close",
      platformLabel: "Platform: {value}",
      noPosts: "No posts saved for this project.",
    },
    loginModal: {
      headline: "Sign In to Continue",
      subtitle: "Create your free account to commission your campaign strategy.",
      googleBtn: "Continue with Google",
      emailBtn: "Continue with Email",
      emailLabel: "Email address",
      emailPlaceholder: "you@company.com",
      emailInvalid: "Please enter a valid email address.",
      sendCodeBtn: "Send Code",
      otpLabel: "Verification code",
      otpHint: "We sent a 6-digit code to {email}.",
      otpInvalid: "Please enter the 6-digit code.",
      verifyBtn: "Verify & Continue",
      backBtn: "Back",
      closeBtn: "Close",
    },
  },
  ar: {
    app: {
      title: "Apex Digital Agency",
      subtitle: "حملات تسويقية مصمَّمة خصيصاً بأيدي استراتيجيين محترفين",
      loading: "جارٍ التحميل...",
      logout: "تسجيل الخروج",
      myProjects: "مشاريعي",
      statusOnline: "فريق الاستراتيجية بالوكالة: متصل الآن",
      planBadge: "الباقة: {plan}",
      daysLabel: "الأيام: {days}",
      planLimitNote: "الحد الأقصى لباقتك الحالية ({plan}): {maxDays} يوم، {maxGenerations} تسليم/شهر.",
      describeLabel: "حدّثنا عن نشاطك التجاري",
      describePlaceholder: "مثال: أدير متجراً إلكترونياً لبيع منتجات العناية بالبشرة العضوية.",
      describeRequired: "هذا الحقل مطلوب — صف نشاطك في جملة أو جملتين ليتمكن استراتيجيونا من إعداد توصية مخصّصة لك.",
      generateBtn: "طلب استراتيجية تسويقية",
      generating: "جارٍ إعداد استراتيجيتك...",
      quotaUsed: "التسليمات المطلوبة هذا الشهر: {used} من {max} (باقة {plan})",
      outputHeading: "مخرجات الحملة واستراتيجية المحتوى",
      loadingStep1: "مديرو الاستراتيجية يحلّلون موقع علامتك التجارية في السوق...",
      loadingStep2: "كبار كتّاب المحتوى يصيغون رسائل حملتك التسويقية...",
      loadingStep3: "قادة الإبداع يصقلون النبرة وأساليب التفاعل...",
      loadingStep4: "جارٍ إنهاء تفاصيل حملتك التسويقية المخصّصة...",
      alertDescribeFirst: "الرجاء وصف مشروعك أولاً قبل طلب استراتيجيتك التسويقية.",
      alertGenericError: "حدث خطأ أثناء إعداد مواد حملتك التسويقية.",
      alertBackendDown: "تعذّر الوصول إلى خادم الوكالة. تأكد أنه يعمل.",
      alertLoginRequiredForUpgrade: "الرجاء تسجيل الدخول قبل ترقية باقتك.",
      alertCheckoutUrlMissing: "رابط الدفع غير مُعدّ بعد. يرجى التواصل مع الدعم.",
    },
    plans: { free: "استشارة أولية", pro: "حملة مخصصة", premium: "إدارة تسويقية شاملة" },
    tiers: { free: "استشارة أولية", pro: "حملة مخصصة", premium: "إدارة تسويقية شاملة" },
    common: { upgrade: "ترقية", dayLabel: "اليوم {n}" },
    content: {
      bestTime: "أفضل وقت للنشر: {time}",
      imageIdea: "اقتراح الصورة: {value}",
      video: "فيديو: {value}",
    },
    pro: {
      languageLabel: "لغة المحتوى",
      languageAuto: "كشف تلقائي (بنفس لغة الوصف)",
      sourceTextLabel: "إعادة تدوير محتوى (اختياري)",
      sourceTextPlaceholder: "الصق مقالاً أو منشور مدونة أو نص فيديو هنا لتحويله إلى منشورات...",
      downloadCsv: "تحميل كملف CSV",
      imagePrompt: "التوجيه الإبداعي للصورة: {value}",
      toneLabel: "نبرة الكتابة",
      toneAuto: "تلقائي (اختيار الخبراء)",
      toneOptions: {
        professional: "احترافية",
        friendly: "ودّية وعفوية",
        humorous: "فكاهية ومرحة",
        luxury: "فاخرة وراقية",
        inspirational: "ملهمة",
        bold: "جريئة ومباشرة",
      },
      goalLabel: "هدف المحتوى",
      goalAuto: "تلقائي (اختيار الخبراء)",
      goalOptions: {
        sales: "زيادة المبيعات",
        engagement: "تعزيز التفاعل",
        awareness: "بناء الوعي بالعلامة التجارية",
        education: "توعية الجمهور",
        promotion: "الترويج لعرض أو مناسبة",
      },
      platformLabel: "المنصة المستهدفة",
      platformAuto: "تلقائي (اختيار الخبراء)",
      platformOptions: {
        instagram: "إنستغرام",
        facebook: "فيسبوك",
        tiktok: "تيك توك",
        linkedin: "لينكد إن",
        twitter: "إكس (تويتر)",
      },
      visualStyleLabel: "التوجيه الفني للصور 👑",
      visualStyleAuto: "تلقائي (اختيار الخبراء)",
      visualStyleOptions: {
        realPhotography: "تصوير فوتوغرافي حقيقي",
        minimalistGraphics: "تصاميم بسيطة (Minimalist)",
        ugcReels: "أسلوب UGC / Reels",
        threeDRenders: "تصاميم ثلاثية الأبعاد (3D)",
      },
    },
    planFeatures: {
      free: { emoji: "✅", label: "استشارة أولية:", description: "معاينة مجانية لاتجاه حملتك المخصّصة." },
      pro: {
        label: "حملة مخصصة:",
        features: [
          "✦ تغطية شهرية كاملة: 5 حملات أسبوعية (تصل لـ 7 أيام لكل حملة)",
          "✦ دعم لغات متعددة",
          "✦ تصدير الخطة بصيغة CSV",
        ],
      },
      premium: {
        label: "إدارة تسويقية شاملة:",
        features: [
          "✦ تغطية شهرية 360 درجة: 12 حملة (تصل لـ 7 أيام لكل حملة)",
          "✦ استراتيجية متعددة المنصات",
          "✦ توجيه إبداعي وإعادة صياغة المحتوى",
        ],
      },
    },
    upsell: {
      free: {
        title: "🔒 ميزات احترافية مقفلة",
        description:
          "هل ترغب في تحميل هذه الخطة في ملف **Excel (CSV)** واختيار **لغة المحتوى** التي تناسبك؟",
        button: "⭐ رقي حسابك إلى الحملة المخصصة",
      },
      pro: {
        title: "🔒 الخدمة الإبداعية الكاملة مقفلة",
        description:
          "هل تريد من فريقنا الإبداعي تقديم **توجيه إبداعي** لكل منشور لتصميم صور احترافية؟ بالإضافة إلى ميزة **إعادة تدوير المحتوى**؟",
        button: "🚀 رقي حسابك إلى الإدارة التسويقية الشاملة",
      },
    },
    free: {
      yourIdea: "فكرتك المخصّصة",
      shotAngle: "زاوية التصوير: {value}",
    },
    // تجربة الباقة المجانية التشويقية — بطاقات هيكلية مموّهة مقفلة + صندوق مقارنة تسويقي.
    // بدون أي ذكر لكلمة "الذكاء الاصطناعي" أو "AI" في هذه النصوص عمداً.
    freeUpsell: {
      lockOverlayText: "لقد قمنا بتجهيز باقي خطة المحتوى المخصصة لمشروعك. رقي حسابك لفتح جميع الأفكار الآن.",
      unlockButton: "افتح الخطة الكاملة",
      coffee: {
        title: "لماذا اشتراكك الشهري أرخص من قهوتك؟",
        description:
          "فنجان القهوة الصباحي يكلفك يومياً، بينما الحصول على استراتيجية محتوى احترافية — تُسلَّم عبر حملات أسبوعية طوال الشهر — سيوفر لك 30 ساعة من التفكير بثمن أقل.",
        cta: "رقي حسابك الآن لفتح الخطة الكاملة، وتصديرها كملف Excel جاهز للعمل.",
        button: "رقي حسابك الآن",
      },
      disclaimer: {
        badge: "مخطط أولي استرشادي (معاينة تمهيدية)",
        body: "هذا المخطط يمثل نموذجاً مبسطاً لمنهجية وكالتنا. استراتيجيات التنفيذ الشاملة عبر جميع القنوات والموجّهة نحو التحويل تُبنى حصرياً ضمن باقتَي Pro و Retainer.",
      },
      lockedCards: {
        sectionTitle: "حصريًا لعملاء الباقات المتقدمة (Pro & Retainer)",
        conversionArchitecture: {
          title: "هندسة التحويل ونصوص إعلانية عالية التأثير",
          tier: "باقة Pro",
        },
        competitorGap: {
          title: "تحليل معمّق لنفسية المنافسين وثغرات القنوات التسويقية",
          tier: "Pro & Premium",
        },
        omnichannelGrowth: {
          title: "مخطط نمو شامل عبر جميع القنوات مع إعادة صياغة إبداعية للمحتوى",
          tier: "باقة Premium",
        },
      },
    },
    // نافذة "VIP Lead Capture" — تظهر بدل التوجيه المباشر لصفحة الدفع عند النقر على أي زر ترقية.
    vip: {
      headline: "وصول حصري للوكالة",
      body: "شكراً لاهتمامك! نظراً للضغط الكبير، باقاتنا المدفوعة ممتلئة حالياً. انضم إلى قائمة كبار الشخصيات (VIP) لنمنحك الأولوية فور توفر مقعد.",
      button: "الانضمام لقائمة كبار الشخصيات",
      sending: "جارٍ الإضافة...",
      success: "تمت إضافتك للقائمة بنجاح! سيتواصل معك فريقنا قريباً.",
      closeBtn: "إغلاق",
      submitError: "حدث خطأ ما. يرجى المحاولة مرة أخرى بعد قليل.",
      loginRequired: "يرجى تسجيل الدخول أولاً حتى نتمكن من إضافتك لقائمة كبار الشخصيات.",
    },
    footer: {
      affiliateLink: "برنامج الشركاء النخبة",
    },
    ambassador: {
      headline: "سفراء الوكالة",
      body: "اربح عمولة متكررة بنسبة 10% كل شهر طيلة فترة اشتراك العميل الذي جلبته. انضم لقائمة الانتظار الخاصة بشركاء النخبة.",
      closeBtn: "إغلاق",
    },
    auth: {
      loginTitle: "تسجيل الدخول",
      registerTitle: "إنشاء حساب جديد",
      loginSubtitle: "مرحباً بعودتك! سجّل الدخول للمتابعة",
      registerSubtitle: "أنشئ حسابك للبدء في استخدام المنصة",
      googleBtn: "التسجيل بواسطة Google",
      or: "أو",
      emailLabel: "البريد الإلكتروني",
      passwordLabel: "كلمة المرور",
      confirmPasswordLabel: "تأكيد كلمة المرور",
      loginBtn: "تسجيل الدخول",
      createAccountBtn: "إنشاء الحساب",
      processing: "جارٍ المعالجة...",
      haveAccount: "لديك حساب بالفعل؟",
      loginLink: "سجّل الدخول",
      noAccount: "ليس لديك حساب؟",
      registerLink: "أنشئ حساباً جديداً",
      errors: {
        fillAllFields: "الرجاء تعبئة جميع الحقول.",
        invalidEmailFormat: "الرجاء إدخال بريد إلكتروني صحيح (مثال: name@gmail.com).",
        passwordMismatch: "كلمتا المرور غير متطابقتين.",
        passwordTooShort: "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
        default: "حدث خطأ ما. حاول مرة أخرى.",
        "auth/email-already-in-use": "هذا البريد الإلكتروني مستخدم بالفعل.",
        "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
        "auth/weak-password": "كلمة المرور ضعيفة جداً (6 أحرف على الأقل).",
        "auth/user-not-found": "لا يوجد حساب بهذا البريد الإلكتروني.",
        "auth/wrong-password": "كلمة المرور غير صحيحة.",
        "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
        "auth/too-many-requests": "محاولات كثيرة جداً. حاول مرة أخرى لاحقاً.",
        "auth/missing-password": "الرجاء إدخال كلمة المرور.",
        "auth/network-request-failed": "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.",
        "auth/operation-not-allowed":
          "تسجيل الدخول بالبريد وكلمة المرور غير مُفعّل بعد في إعدادات Firebase لهذا المشروع.",
        "auth/configuration-not-found":
          "خدمة Authentication غير مُهيّأة بعد في مشروع Firebase (افتح تبويب Authentication في الكونسول واضغط Get started).",
        "auth/popup-blocked": "المتصفح منع فتح نافذة تسجيل الدخول. اسمح بالنوافذ المنبثقة وحاول مجدداً.",
        "auth/account-exists-with-different-credential":
          "هذا البريد الإلكتروني مسجّل مسبقاً بطريقة تسجيل دخول مختلفة (مثلاً بكلمة مرور).",
        "auth/unauthorized-domain":
          "هذا النطاق غير مُصرّح له بتسجيل الدخول عبر Google. أضِفه في Firebase Console → Authentication → Settings → Authorized domains.",
      },
    },
    // رسائل أخطاء ديناميكية قادمة من الباكند (/api/generate-content و /api/micro-tool)،
    // مربوطة بكود الخطأ (errorCode) بدل نص عربي ثابت مباشر — بهذا تظهر بنفس لغة الواجهة الحالية.
    apiErrors: {
      SERVER_NOT_READY: "الخادم غير مهيأ للتحقق من حسابك حالياً. يرجى المحاولة بعد قليل.",
      AUTH_REQUIRED: "الرجاء تسجيل الدخول أولاً قبل طلب استراتيجيتك التسويقية.",
      DESCRIPTION_REQUIRED: "الرجاء وصف مشروعك أولاً قبل طلب استراتيجيتك التسويقية.",
      API_KEY_MISSING: "لم يتم إعداد خدمة الاستراتيجية على الخادم بعد. يرجى التواصل مع الدعم.",
      USER_NOT_FOUND: "لم يتم العثور على ملف حسابك. حاول تسجيل الخروج والدخول من جديد.",
      QUOTA_EXCEEDED:
        "لقد استنفدت عدد التسليمات المسموح بها هذا الشهر لباقتك ({plan}: {max} تسليم/شهر). سيُجدَّد رصيدك تلقائياً في بداية الشهر القادم، أو يمكنك الترقية للحصول على رصيد أكبر.",
      GENERATION_FAILED: "حدث خطأ أثناء إعداد مواد حملتك التسويقية. حاول مرة أخرى بعد قليل.",
      SAVE_FAILED: "تم إعداد استراتيجيتك لكن تعذّر حفظها. حاول مرة أخرى بعد قليل.",
      CORS_FORBIDDEN: "هذا الطلب قادم من مصدر غير مسموح به.",
      default: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    },
    // شاشة "مشاريعي" (History.js) — سجل كل الدورات المحفوظة في Firestore لهذا المستخدم.
    history: {
      pageTitle: "مشاريعي",
      backToApp: "العودة للوحة التحكم",
      loading: "جارٍ تحميل مشاريعك...",
      empty: "لم تطلب أي حملة تسويقية بعد.",
      emptyCta: "اطلب أول استراتيجية تسويقية لك",
      loadError: "تعذّر تحميل مشاريعك. حاول مرة أخرى.",
      deleteError: "تعذّر حذف هذا المشروع. حاول مرة أخرى.",
      confirmDelete: "هل أنت متأكد من حذف هذا المشروع؟ لا يمكن التراجع عن هذا الإجراء.",
      deleting: "جارٍ الحذف...",
      noDescription: "(بدون وصف)",
      daysLabel: "الأيام: {days}",
      postsLabel: "المنشورات: {count}",
      planLabel: "الباقة: {plan}",
      viewBtn: "عرض",
      editBtn: "تعديل",
      exportBtn: "تصدير CSV",
      deleteBtn: "حذف",
      comingSoon: "قريباً",
      modalTitle: "تفاصيل المشروع",
      closeBtn: "إغلاق",
      platformLabel: "المنصة: {value}",
      noPosts: "لا توجد منشورات محفوظة لهذا المشروع.",
    },
    loginModal: {
      headline: "سجّل الدخول للمتابعة",
      subtitle: "أنشئ حسابك المجاني لطلب استراتيجية حملتك التسويقية.",
      googleBtn: "المتابعة عبر جوجل",
      emailBtn: "المتابعة عبر البريد الإلكتروني",
      emailLabel: "البريد الإلكتروني",
      emailPlaceholder: "you@company.com",
      emailInvalid: "يرجى إدخال بريد إلكتروني صحيح.",
      sendCodeBtn: "إرسال الرمز",
      otpLabel: "رمز التحقق",
      otpHint: "أرسلنا رمزاً مكوناً من 6 أرقام إلى {email}.",
      otpInvalid: "يرجى إدخال الرمز المكوّن من 6 أرقام.",
      verifyBtn: "تحقق وتابع",
      backBtn: "رجوع",
      closeBtn: "إغلاق",
    },
  },
  fr: {
    app: {
      title: "Apex Digital Agency",
      subtitle: "Des campagnes marketing sur mesure, conçues par des stratèges expérimentés",
      loading: "Chargement...",
      logout: "Déconnexion",
      myProjects: "Mes projets",
      statusOnline: "Équipe stratégie de l'agence : en ligne",
      planBadge: "Forfait : {plan}",
      daysLabel: "Jours : {days}",
      planLimitNote:
        "Limite de votre forfait actuel ({plan}) : {maxDays} jour(s), {maxGenerations} livrable(s)/mois.",
      describeLabel: "Parlez-nous de votre entreprise",
      describePlaceholder: "ex: Je gère une boutique en ligne de produits de soins bio.",
      describeRequired:
        "Ce champ est obligatoire — décrivez votre entreprise en une ou deux phrases pour que nos stratèges puissent élaborer une recommandation sur mesure.",
      generateBtn: "Lancer la stratégie",
      generating: "Préparation de votre stratégie...",
      quotaUsed: "Livrables commandés ce mois-ci : {used} sur {max} (forfait {plan})",
      outputHeading: "Livrables de campagne et stratégie de contenu",
      loadingStep1: "Nos directeurs de stratégie analysent le positionnement de votre marque...",
      loadingStep2: "Nos rédacteurs seniors élaborent les accroches de votre campagne...",
      loadingStep3: "Nos directeurs créatifs affinent le ton et les leviers d'engagement...",
      loadingStep4: "Finalisation de vos livrables marketing sur mesure...",
      alertDescribeFirst: "Veuillez décrire votre entreprise avant de lancer votre stratégie de campagne.",
      alertGenericError: "Une erreur est survenue lors de la préparation de vos supports de campagne.",
      alertBackendDown: "Impossible de contacter le serveur de l'agence. Vérifiez qu'il est bien démarré.",
      alertLoginRequiredForUpgrade: "Veuillez vous connecter avant de mettre à niveau votre forfait.",
      alertCheckoutUrlMissing: "Le lien de paiement n'est pas encore configuré. Veuillez contacter le support.",
    },
    plans: { free: "Consultation Stratégique", pro: "Campagne Sur Mesure", premium: "Forfait Agence Complet" },
    tiers: { free: "Consultation Stratégique", pro: "Campagne Sur Mesure", premium: "Forfait Agence Complet" },
    common: { upgrade: "Passer à l'offre supérieure", dayLabel: "Jour {n}" },
    content: {
      bestTime: "Meilleure heure de publication : {time}",
      imageIdea: "Suggestion d'image : {value}",
      video: "Vidéo : {value}",
    },
    pro: {
      languageLabel: "Langue du contenu",
      languageAuto: "Détection automatique (comme la description)",
      sourceTextLabel: "Recyclage de contenu (optionnel)",
      sourceTextPlaceholder:
        "Collez ici un article, un billet de blog ou un script vidéo à transformer en publications...",
      downloadCsv: "Télécharger en CSV",
      imagePrompt: "Direction créative : {value}",
      toneLabel: "Ton de la rédaction",
      toneAuto: "Auto (Sélection d'experts)",
      toneOptions: {
        professional: "Professionnel",
        friendly: "Amical et décontracté",
        humorous: "Humoristique",
        luxury: "Luxueux et haut de gamme",
        inspirational: "Inspirant",
        bold: "Direct et affirmé",
      },
      goalLabel: "Objectif du contenu",
      goalAuto: "Auto (Sélection d'experts)",
      goalOptions: {
        sales: "Augmenter les ventes",
        engagement: "Booster l'engagement",
        awareness: "Renforcer la notoriété de la marque",
        education: "Éduquer l'audience",
        promotion: "Promouvoir une offre ou un événement",
      },
      platformLabel: "Plateforme ciblée",
      platformAuto: "Auto (Sélection d'experts)",
      platformOptions: {
        instagram: "Instagram",
        facebook: "Facebook",
        tiktok: "TikTok",
        linkedin: "LinkedIn",
        twitter: "X (Twitter)",
      },
      visualStyleLabel: "Direction Visuelle 👑",
      visualStyleAuto: "Auto (Sélection d'experts)",
      visualStyleOptions: {
        realPhotography: "Photographie réelle",
        minimalistGraphics: "Graphismes minimalistes",
        ugcReels: "Style UGC / Reels",
        threeDRenders: "Rendus 3D",
      },
    },
    planFeatures: {
      free: { emoji: "✅", label: "Consultation Stratégique :", description: "Un aperçu gratuit de l'orientation de votre campagne sur mesure." },
      pro: {
        label: "Campagne Sur Mesure :",
        features: [
          "✦ Couverture Mensuelle : 5 Sprints Hebdomadaires (Jusqu'à 7 jours chacun)",
          "✦ Support Multilingue",
          "✦ Exportation CSV",
        ],
      },
      premium: {
        label: "Forfait Agence Complet :",
        features: [
          "✦ Couverture Mensuelle 360° : 12 Sprints (Jusqu'à 7 jours chacun)",
          "✦ Stratégie Omnicanal",
          "✦ Direction Créative et Recyclage",
        ],
      },
    },
    upsell: {
      free: {
        title: "🔒 Fonctionnalités professionnelles verrouillées",
        description:
          "Souhaitez-vous télécharger ce plan au format **Excel (CSV)** et choisir la **langue du contenu** qui vous convient ?",
        button: "⭐ Passez à la Campagne Sur Mesure",
      },
      pro: {
        title: "🔒 Le service créatif complet est verrouillé",
        description:
          "Souhaitez-vous que notre équipe créative fournisse une **direction créative** pour chaque publication afin de créer des visuels professionnels ? Ainsi que la fonctionnalité de **recyclage de contenu** ?",
        button: "🚀 Passez au Forfait Agence Complet",
      },
    },
    free: {
      yourIdea: "Votre idée personnalisée",
      shotAngle: "Angle de prise de vue : {value}",
    },
    // Expérience teaser du forfait Gratuit — cartes squelettes floutées verrouillées +
    // encadré comparatif marketing. Aucune mention de "IA"/"AI" dans ces textes, volontairement.
    freeUpsell: {
      lockOverlayText:
        "Nous avons déjà préparé le reste de votre plan de contenu personnalisé. Passez à l'offre supérieure pour débloquer toutes les idées dès maintenant.",
      unlockButton: "Débloquer le plan complet",
      coffee: {
        title: "Pourquoi votre abonnement mensuel coûte moins cher que votre café",
        description:
          "Votre café du matin vous coûte chaque jour, alors qu'une stratégie de contenu professionnelle — livrée en sprints hebdomadaires tout au long du mois — vous fait économiser 30 heures de réflexion, pour moins cher.",
        cta: "Passez à l'offre supérieure dès maintenant pour débloquer le plan complet et l'exporter en fichier Excel prêt à l'emploi.",
        button: "Passer à l'offre supérieure",
      },
      disclaimer: {
        badge: "Aperçu Stratégique Préliminaire (Spécimen)",
        body: "Ce plan représente une démonstration simplifiée de la méthodologie de notre agence. Les stratégies d'exécution omnicanales axées sur la conversion sont déployées exclusivement dans nos forfaits Pro et Retainer.",
      },
      lockedCards: {
        sectionTitle: "Réservé aux clients Pro & Retainer",
        conversionArchitecture: {
          title: "Architecture de conversion et accroches publicitaires à fort impact",
          tier: "Pro",
        },
        competitorGap: {
          title: "Psychologie approfondie des concurrents et analyse des opportunités omnicanales",
          tier: "Pro & Premium",
        },
        omnichannelGrowth: {
          title: "Plan de croissance omnicanal et recyclage créatif de contenu",
          tier: "Premium",
        },
      },
    },
    // Fenêtre "VIP Lead Capture" — s'affiche à la place de la redirection directe vers la page
    // de paiement lors d'un clic sur un bouton de mise à niveau.
    vip: {
      headline: "Accès Exclusif à l'Agence",
      body: "Merci pour votre intérêt ! En raison d'une forte demande, nos forfaits premium sont actuellement complets. Rejoignez notre liste VIP pour être prioritaire dès qu'une place se libère.",
      button: "Rejoindre la liste VIP",
      sending: "Ajout en cours...",
      success: "Vous êtes sur la liste ! Notre équipe vous contactera bientôt.",
      closeBtn: "Fermer",
      submitError: "Une erreur s'est produite. Veuillez réessayer dans un instant.",
      loginRequired: "Veuillez vous connecter d'abord pour que nous puissions vous ajouter à la liste VIP.",
    },
    footer: {
      affiliateLink: "Programme Partenaires Élite",
    },
    ambassador: {
      headline: "Ambassadeurs de l'Agence",
      body: "Gagnez une commission récurrente de 10% chaque mois tant que votre client reste abonné. Rejoignez notre liste d'attente.",
      closeBtn: "Fermer",
    },
    auth: {
      loginTitle: "Connexion",
      registerTitle: "Créer un nouveau compte",
      loginSubtitle: "Content de vous revoir ! Connectez-vous pour continuer",
      registerSubtitle: "Créez votre compte pour commencer",
      googleBtn: "Se connecter avec Google",
      or: "ou",
      emailLabel: "Adresse e-mail",
      passwordLabel: "Mot de passe",
      confirmPasswordLabel: "Confirmer le mot de passe",
      loginBtn: "Connexion",
      createAccountBtn: "Créer le compte",
      processing: "Traitement en cours...",
      haveAccount: "Vous avez déjà un compte ?",
      loginLink: "Connexion",
      noAccount: "Vous n'avez pas de compte ?",
      registerLink: "Créez-en un",
      errors: {
        fillAllFields: "Veuillez remplir tous les champs.",
        invalidEmailFormat: "Veuillez entrer une adresse e-mail valide (ex : nom@gmail.com).",
        passwordMismatch: "Les mots de passe ne correspondent pas.",
        passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères.",
        default: "Une erreur est survenue. Veuillez réessayer.",
        "auth/email-already-in-use": "Cette adresse e-mail est déjà utilisée.",
        "auth/invalid-email": "Cette adresse e-mail n'est pas valide.",
        "auth/weak-password": "Ce mot de passe est trop faible (6 caractères minimum).",
        "auth/user-not-found": "Aucun compte n'a été trouvé avec cette adresse e-mail.",
        "auth/wrong-password": "Mot de passe incorrect.",
        "auth/invalid-credential": "E-mail ou mot de passe incorrect.",
        "auth/too-many-requests": "Trop de tentatives. Veuillez réessayer plus tard.",
        "auth/missing-password": "Veuillez entrer un mot de passe.",
        "auth/network-request-failed":
          "Impossible de se connecter au serveur. Vérifiez votre connexion internet.",
        "auth/operation-not-allowed":
          "La connexion par e-mail/mot de passe n'est pas encore activée dans les paramètres Firebase de ce projet.",
        "auth/configuration-not-found":
          "Le service Authentication n'est pas encore configuré dans le projet Firebase (ouvrez l'onglet Authentication dans la console et cliquez sur Get started).",
        "auth/popup-blocked":
          "Votre navigateur a bloqué la fenêtre de connexion. Autorisez les fenêtres pop-up et réessayez.",
        "auth/account-exists-with-different-credential":
          "Cette adresse e-mail est déjà enregistrée avec une autre méthode de connexion (par exemple un mot de passe).",
        "auth/unauthorized-domain":
          "Ce domaine n'est pas autorisé pour la connexion Google. Ajoutez-le dans Firebase Console → Authentication → Settings → Authorized domains.",
      },
    },
    // Messages d'erreur dynamiques provenant du backend (/api/generate-content et /api/micro-tool),
    // associés au code d'erreur (errorCode) plutôt qu'à un texte arabe fixe — ainsi le message
    // s'affiche toujours dans la langue d'interface actuelle de l'utilisateur.
    apiErrors: {
      SERVER_NOT_READY:
        "Le serveur n'est pas prêt à vérifier votre compte pour le moment. Réessayez dans un instant.",
      AUTH_REQUIRED: "Veuillez vous connecter avant de lancer votre stratégie de campagne.",
      DESCRIPTION_REQUIRED: "Veuillez décrire votre activité avant de lancer votre stratégie de campagne.",
      API_KEY_MISSING:
        "Notre service de stratégie n'est pas encore configuré sur le serveur. Veuillez contacter le support.",
      USER_NOT_FOUND:
        "Impossible de trouver le profil de votre compte. Essayez de vous déconnecter puis de vous reconnecter.",
      QUOTA_EXCEEDED:
        "Vous avez utilisé tous vos livrables ce mois-ci pour votre forfait {plan} ({max} livrables/mois). Votre quota sera réinitialisé automatiquement le mois prochain, ou vous pouvez passer à un forfait supérieur.",
      GENERATION_FAILED:
        "Une erreur s'est produite lors de la préparation de vos supports de campagne. Veuillez réessayer dans un instant.",
      SAVE_FAILED:
        "Votre stratégie de campagne a été préparée mais n'a pas pu être enregistrée. Veuillez réessayer dans un instant.",
      CORS_FORBIDDEN: "Cette requête provient d'une source non autorisée.",
      default: "Une erreur s'est produite. Veuillez réessayer.",
    },
    // Écran "Mes projets" (History.js) — historique de tous les cycles enregistrés dans
    // Firestore pour cet utilisateur.
    history: {
      pageTitle: "Mes projets",
      backToApp: "Retour au tableau de bord",
      loading: "Chargement de vos projets...",
      empty: "Vous n'avez encore commandé aucune campagne.",
      emptyCta: "Commandez votre première stratégie de campagne",
      loadError: "Impossible de charger vos projets. Veuillez réessayer.",
      deleteError: "Impossible de supprimer ce projet. Veuillez réessayer.",
      confirmDelete: "Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.",
      deleting: "Suppression en cours...",
      noDescription: "(Aucune description)",
      daysLabel: "Jours : {days}",
      postsLabel: "Publications : {count}",
      planLabel: "Forfait : {plan}",
      viewBtn: "Voir",
      editBtn: "Modifier",
      exportBtn: "Exporter en CSV",
      deleteBtn: "Supprimer",
      comingSoon: "Bientôt disponible",
      modalTitle: "Détails du projet",
      closeBtn: "Fermer",
      platformLabel: "Plateforme : {value}",
      noPosts: "Aucune publication enregistrée pour ce projet.",
    },
    loginModal: {
      headline: "Connectez-vous pour continuer",
      subtitle: "Créez votre compte gratuit pour commander votre stratégie de campagne.",
      googleBtn: "Continuer avec Google",
      emailBtn: "Continuer avec l'e-mail",
      emailLabel: "Adresse e-mail",
      emailPlaceholder: "vous@entreprise.com",
      emailInvalid: "Veuillez saisir une adresse e-mail valide.",
      sendCodeBtn: "Envoyer le code",
      otpLabel: "Code de vérification",
      otpHint: "Nous avons envoyé un code à 6 chiffres à {email}.",
      otpInvalid: "Veuillez saisir le code à 6 chiffres.",
      verifyBtn: "Vérifier et continuer",
      backBtn: "Retour",
      closeBtn: "Fermer",
    },
  },
};

const STORAGE_KEY = "contentCalendarAI.language";
const RTL_LANGUAGES = ["ar"]; // أي لغة تُضاف هنا مستقبلاً وتحتاج RTL (مثل الأردية أو الفارسية) تُذكر في هذه القائمة فقط.
const DEFAULT_LANGUAGE = "en";

function getByPath(obj, dottedPath) {
  return dottedPath.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function interpolate(value, vars) {
  if (typeof value !== "string" || !vars) return value;
  return Object.keys(vars).reduce(
    (acc, key) => acc.split("{" + key + "}").join(String(vars[key])),
    value
  );
}

// يدعم تنسيقاً بسيطاً على طراز Markdown، **نص عريض**، داخل أي نص ترجمة، حتى يمكن لجملة
// مترجمة واحدة أن تتضمّن كلمات بارزة (bold) بدل تقسيمها إلى عدة مفاتيح ترجمة منفصلة.
// يُستخدم في JSX هكذا: <p>{renderWithBold(t("some.key"))}</p>
export function renderWithBold(text) {
  const parts = String(text == null ? "" : text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return React.createElement("b", { key: i }, part.slice(2, -2));
    }
    return React.createElement(React.Fragment, { key: i }, part);
  });
}

function translate(lang, key, vars) {
  const value = getByPath(translations[lang], key);
  if (value !== undefined) return interpolate(value, vars);

  // احتياط: مفتاح مفقود في اللغة الحالية (مثلاً لغة جديدة لم تُستكمل ترجمتها بعد) —
  // نعود إلى الإنجليزية بدل كسر الواجهة أو عرض شيء فارغ.
  const fallback = getByPath(translations[DEFAULT_LANGUAGE], key);
  if (fallback !== undefined) return interpolate(fallback, vars);

  console.warn('[i18n] مفتاح ترجمة مفقود: "' + key + '"');
  return key;
}

function readSavedLanguage() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) return saved;
  } catch (_) {
    // localStorage قد يكون غير متاح (وضع تصفح خاص، إلخ) — نتجاهل بهدوء ونستخدم الافتراضي.
  }
  return DEFAULT_LANGUAGE;
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readSavedLanguage);
  const dir = RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr";

  // يطبّق اتجاه الصفحة (LTR/RTL) ولغة عنصر <html> تلقائياً في كل مرة تتغيّر فيها اللغة،
  // ويحفظ اختيار المستخدم في localStorage ليبقى محفوظاً بعد إعادة تحميل الصفحة أو فتحها لاحقاً.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {
      // تجاهل بهدوء إن تعذّر الحفظ
    }
  }, [lang, dir]);

  const setLang = (nextLang) => {
    if (translations[nextLang]) setLangState(nextLang);
  };

  const value = {
    lang,
    dir,
    isRtl: dir === "rtl",
    setLang,
    availableLanguages: Object.keys(translations),
    t: (key, vars) => translate(lang, key, vars),
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage() يجب أن تُستخدم داخل <LanguageProvider>");
  }
  return ctx;
}

// أسماء العرض داخل زر التبديل نفسه — تبقى بصيغة رمز اللغة (EN/AR) بغض النظر عن
// اللغة الحالية للواجهة، حتى يتعرّف المستخدم على لغته حتى لو كانت الواجهة الحالية بلغة أخرى.
const LANGUAGE_DISPLAY_NAMES = { en: "EN", ar: "AR", fr: "FR" };

// زر تبديل اللغة — ثابت أعلى الصفحة (fixed)، ويظهر في كل الشاشات (تسجيل الدخول والتطبيق
// الرئيسي على حد سواء) لأن اختيار اللغة يجب أن يكون متاحاً دائماً بغض النظر عن حالة الدخول.
export function LanguageSwitcher() {
  const { lang, setLang, availableLanguages, isRtl } = useLanguage();

  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        [isRtl ? "left" : "right"]: "1rem",
        zIndex: 1000,
        display: "flex",
        gap: "0.25rem",
        background: "rgba(0,0,0,0.25)",
        padding: "0.3rem",
        borderRadius: "999px",
        backdropFilter: "blur(6px)",
      }}
    >
      {availableLanguages.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          style={{
            padding: "0.35rem 0.85rem",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: "0.03em",
            background: lang === code ? "#ffffff" : "transparent",
            color: lang === code ? "#3b82f6" : "#ffffff",
            transition: "background 0.15s ease, color 0.15s ease",
          }}
        >
          {LANGUAGE_DISPLAY_NAMES[code] || code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
