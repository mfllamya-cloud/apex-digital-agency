// ---------------------------------------------------------------------------
// قاموس صفحات الوكالة (الأسعار، الأعمال، الأسئلة الشائعة، روابط التذييل) بخمس لغات.
//
// لماذا ملف منفصل عن i18n.js؟
//   • i18n.js أصلاً 1009 سطراً؛ إضافة خمس لغات داخله كانت ستجعله ~1700 سطراً، وكل
//     تعديل مستقبلي يعني إعادة لصق الملف كاملاً يدوياً.
//   • هذه النصوص هي *صفحات البيع*، وتتغيّر أكثر بكثير من نصوص المولّد.
//   • i18n.js يدمج هذا الملف تلقائياً تحت المفتاح "agency" لكل لغة، فالاستعمال يبقى
//     t("agency.pricing.title") كأي مفتاح آخر.
//
// الإسبانية والإيطالية موجودتان هنا فقط (صفحات الوكالة). دالة translate() في i18n.js
// ترجع تلقائياً إلى الإنجليزية لأي مفتاح غير موجود، لذا يرى مستخدم ES/IT صفحات البيع
// بلغته وواجهة المولّد بالإنجليزية — بلا أي كسر وبلا ترجمة آلية رديئة.
//
// ⚠️ أسماء الباقتين (Apex Starter Campaign / Apex Conversion Pro) أسماء تجارية: تبقى
// كما هي في كل اللغات ولا تُترجم.
// ---------------------------------------------------------------------------
export const agencyTranslations = {
  // =========================================================================
  // ENGLISH
  // =========================================================================
  en: {
    self: {
      eyebrow: "Self-Service",
      title: "Professional Content Planning & Strategy",
      sub: "Describe your business and get a ready-to-post content plan in minutes. You run the tool yourself.",
    },
    // تسميات أسعار باقات المولّد. الأرقام نفسها معرَّفة في PLAN_PRICES داخل App.js
    // (مكان واحد فقط)، وهذه النصوص هي ما يُترجم.
    // نصوص نافذة اختيار وسيلة الدفع (PaymentModal.js) — يستعملها المساران معاً:
    // باقات المولّد في App.js وباقات الوكالة في Pricing.js.
    checkout: {
      eyebrow: "Secure checkout",
      title: "Choose how to pay",
      subtitle: "Pick a payment method. You'll be taken to the provider's secure page to complete the order.",
      card: "Pay by Card / PayPal",
      cardHint: "Visa, Mastercard, Amex, PayPal",
      crypto: "Pay with Crypto",
      cryptoHint: "BTC, ETH, USDT and more",
      soon: "Not available yet",
      failed: "We couldn't open the card checkout. Please try crypto, or contact us and we'll send you a payment link.",
      close: "Close",
      orderNow: "Order now",
      upgrade: "Upgrade",
      consent: "By continuing you confirm that production may begin immediately and that you have read our",
      consentLink: "Refund Policy",
    },
    plans: {
      free: "Free",
      perMonth: "/mo",
    },
    pricing: {
      eyebrow: "Professional Video Ads",
      title: "Done-For-You Video Ads",
      sub: "We produce the ads for you from scratch — scripting, editing, voiceover and copy included. One-time payment, no subscription.",
      popular: "Most Popular",
      oneTime: "one-time",
      included: "Included",
      noRush: "No rush fee — standard turnaround",
      basePlus: "{base} base + {extra} {label}",
      // ⚠️ بلا رمز $ هنا عمداً: كتابة رمز الدولار متبوعاً مباشرة بقوس معقوف داخل سلسلة عادية تُسقط بناء CRA على
      // قاعدة no-template-curly-in-string (وCI=true على Vercel يحوّل التحذير إلى خطأ).
      // Pricing.js يمرّر المبلغ مُنسَّقاً بالفعل ("$100")، فيبقى الرمز ظاهراً للزائر.
      speedLegend: "Delivery speed",
      paypal: "Pay with PayPal",
      crypto: "Pay with Crypto",
      soon: "Payment link coming soon",
      consent: "By paying you confirm that production may begin immediately and that you have read our",
      consentLink: "Refund Policy",
      packages: {
        starter: {
          name: "Apex Starter Campaign",
          tagline: "Test your offer with a single high-converting ad.",
          features: [
            "1 Hook-optimized Video Ad (15–30s)",
            "1 Retargeting Ad Creative",
            "Persuasive Copywriting",
            "Premium Studio Voiceover & Music",
            "1 Revision",
            "48-hour delivery",
          ],
        },
        pro: {
          name: "Apex Conversion Pro",
          tagline: "A full testing suite built to find your winning creative.",
          features: [
            "5 video ads: one product with 5 hooks (A/B testing), or up to 5 products — your choice",
            "3 advanced ad designs, for the same product or different products",
            "Deep Market Copywriting & VFX",
            "Multi-Format (9:16 & 1:1)",
            "3 revisions for the whole order",
            "3–5 days delivery",
          ],
        },
      },
      speeds: {
        standard: "Standard delivery",
        express: "Express delivery",
        priority: "Priority delivery",
      },
      details: {
        starter: { standard: "48 hours", express: "24 hours", priority: "12 hours" },
        pro: { standard: "3–5 days", express: "48 hours", priority: "24 hours, full team" },
      },
    },
    portfolio: {
      eyebrow: "Recent Work",
      title: "The formats we build",
      sub: "Short-form ads written and edited to stop the scroll in the first two seconds, then carry the viewer to the offer.",
      sampleSlot: "Sample slot",
      items: {
        hookDemo: { title: "Hook-first product demo", format: "TikTok · 9:16" },
        ugc: { title: "UGC testimonial style", format: "Reels · 9:16" },
        problem: { title: "Problem → solution", format: "Meta Feed · 1:1" },
        offer: { title: "Offer & urgency close", format: "Shorts · 9:16" },
      },
    },
    faq: {
      eyebrow: "Before you order",
      title: "Questions, answered",
      sub: "If something here isn't clear, email us before you pay — not after.",
      stillUnsure: "Still unsure?",
      refundLink: "Refund Policy",
      items: {
        turnaround: {
          q: "How long does it take?",
          a: "Apex Starter Campaign is delivered within 48 hours and Apex Conversion Pro within 3–5 days. The clock starts when two things have arrived: your payment has cleared and your brief is complete, including any product photos, footage or brand assets we need. If you need it sooner, the express and priority options on each package shorten that to 24 or 12 hours on Starter, and 48 or 24 hours on Pro.",
        },
        revisions: {
          q: "Do I get revisions?",
          a: "Yes — one revision with Starter, three with Pro. A revision covers anything inside the brief you approved: pacing, captions, music, the order of scenes, colour, small copy changes. Changing the product, the offer, the audience or the whole concept is new work and gets quoted separately. Send revision requests within 7 days of delivery.",
        },
        noScript: {
          q: "What if I don't have a script?",
          a: "You don't need one. Writing the script is part of every package — that's what the copywriting line covers. Tell us what you sell, who it's for, what you want the viewer to do, and anything you already know works. We write the hook and the script from that and send it with the first cut.",
        },
        noFootage: {
          q: "What if I don't have any footage?",
          a: "We can work from product photos, your website, or licensed stock. For UGC-style ads, simple phone footage of the product in use goes a long way, and we'll tell you exactly what to shoot. If we use licensed stock, the licence covers the ads we deliver to you — it isn't a separate stock licence for your other projects.",
        },
        formats: {
          q: "What do I actually receive?",
          a: "MP4 video files ready to upload, plus the ad copy as text. Pro is delivered in both 9:16 and 1:1, so the same campaign runs on TikTok, Reels, Shorts and the Meta feed without re-cropping. Starter is delivered in 9:16.",
        },
        rights: {
          q: "Who owns the ads?",
          a: "You do, once payment is complete — full commercial rights, any market, no time limit. We keep the project files and our own templates and methods. We may show the finished work in our portfolio unless you tell us in writing that you'd rather we didn't.",
        },
        results: {
          q: "Do you guarantee results?",
          a: "No, and be careful with anyone who does. We control the creative; your results also depend on your offer, price, landing page, targeting and budget. What we do guarantee is that the work matches the brief you approved, and we keep revising until it does.",
        },
        refunds: {
          q: "Can I get a refund?",
          a: "Before production starts, yes — full refund, minus the payment processor's fee. Once production has started the sale is final, because the work is made from scratch for you and can't be resold. If something is wrong with the delivery, the included revisions are how we fix it. Full details are in our",
        },
        payment: {
          q: "How do I pay?",
          a: "PayPal or cryptocurrency, in full, before production begins. Prices are in US dollars. Crypto payments can't be reversed once confirmed on-chain, so check the package and delivery speed before sending.",
        },
      },
    },
    footer: { terms: "Terms of Service", privacy: "Privacy Policy", refund: "Refund Policy" },
  },

  // =========================================================================
  // ARABIC (RTL)
  // =========================================================================
  ar: {
    self: {
      eyebrow: "خدمة ذاتية",
      title: "تخطيط احترافي للمحتوى والاستراتيجية",
      sub: "صِف مشروعك واحصل على خطة محتوى جاهزة للنشر في دقائق. أنت من يشغّل الأداة بنفسك.",
    },
    checkout: {
      eyebrow: "دفع آمن",
      title: "اختر طريقة الدفع",
      subtitle: "اختر وسيلة الدفع، وسننقلك إلى صفحة المزوّد الآمنة لإتمام الطلب.",
      card: "الدفع ببطاقة / PayPal",
      cardHint: "فيزا، ماستركارد، أمريكان إكسبريس، PayPal",
      crypto: "الدفع بالعملات الرقمية",
      cryptoHint: "BTC و ETH و USDT وغيرها",
      soon: "غير متاح بعد",
      failed: "تعذّر فتح صفحة الدفع بالبطاقة. جرّبي العملات الرقمية، أو راسلينا ونرسل لك رابط دفع.",
      close: "إغلاق",
      orderNow: "اطلب الآن",
      upgrade: "ترقية",
      consent: "بالمتابعة فإنك تؤكد أن الإنتاج يمكن أن يبدأ فوراً، وأنك اطّلعت على",
      consentLink: "سياسة الاسترجاع",
    },
    plans: {
      free: "مجاناً",
      perMonth: "/شهرياً",
    },
    pricing: {
      eyebrow: "إعلانات فيديو احترافية",
      title: "إعلانات فيديو تُنفَّذ لك بالكامل",
      sub: "ننتج لك الإعلانات من الصفر — السيناريو والمونتاج والتعليق الصوتي والنصوص الإعلانية. دفعة واحدة، بلا اشتراك.",
      popular: "الأكثر طلباً",
      oneTime: "دفعة واحدة",
      included: "مشمول",
      noRush: "بلا رسوم استعجال — المدة الاعتيادية",
      basePlus: "{base} أساسي + {extra} {label}",
      speedLegend: "سرعة التسليم",
      paypal: "ادفع عبر PayPal",
      crypto: "ادفع بالعملات الرقمية",
      soon: "رابط الدفع قيد الإعداد",
      consent: "بإتمام الدفع فإنك تؤكد أن الإنتاج يمكن أن يبدأ فوراً، وأنك اطّلعت على",
      consentLink: "سياسة الاسترجاع",
      packages: {
        starter: {
          name: "Apex Starter Campaign",
          tagline: "اختبر عرضك بإعلان واحد عالي التحويل.",
          features: [
            "إعلان فيديو واحد بافتتاحية مُحسَّنة (15–30 ثانية)",
            "تصميم إعلاني واحد لإعادة الاستهداف",
            "كتابة نصوص إقناعية",
            "تعليق صوتي وموسيقى بجودة استوديو",
            "تعديل واحد",
            "التسليم خلال 48 ساعة",
          ],
        },
        pro: {
          name: "Apex Conversion Pro",
          tagline: "حزمة اختبار كاملة للوصول إلى الإعلان الرابح.",
          features: [
            "5 إعلانات فيديو: منتج واحد بخمس افتتاحيات مختلفة (اختبار A/B)، أو حتى 5 منتجات — الخيار لك",
            "3 تصاميم إعلانية متقدّمة، لمنتج واحد أو لمنتجات مختلفة",
            "كتابة تسويقية معمّقة ومؤثرات بصرية",
            "صيغ متعدّدة (9:16 و 1:1)",
            "3 تعديلات على الطلب كاملاً",
            "التسليم خلال 3–5 أيام",
          ],
        },
      },
      speeds: {
        standard: "تسليم عادي",
        express: "تسليم سريع",
        priority: "تسليم بأولوية قصوى",
      },
      details: {
        starter: { standard: "48 ساعة", express: "24 ساعة", priority: "12 ساعة" },
        pro: { standard: "3–5 أيام", express: "48 ساعة", priority: "24 ساعة، بفريق كامل" },
      },
    },
    portfolio: {
      eyebrow: "أعمال حديثة",
      title: "الصيغ التي ننتجها",
      sub: "إعلانات قصيرة مكتوبة ومركَّبة لإيقاف التمرير في أول ثانيتين، ثم قيادة المشاهد إلى العرض.",
      sampleSlot: "مكان لعمل قادم",
      items: {
        hookDemo: { title: "عرض منتج بافتتاحية قوية", format: "تيك توك · 9:16" },
        ugc: { title: "أسلوب شهادة عميل (UGC)", format: "ريلز · 9:16" },
        problem: { title: "مشكلة ← حل", format: "ميتا · 1:1" },
        offer: { title: "العرض وإغلاق بالإلحاح", format: "شورتس · 9:16" },
      },
    },
    faq: {
      eyebrow: "قبل أن تطلب",
      title: "أسئلة وأجوبة",
      sub: "إن لم يكن شيء واضحاً هنا، راسلنا قبل الدفع — لا بعده.",
      stillUnsure: "ما زال لديك سؤال؟",
      refundLink: "سياسة الاسترجاع",
      items: {
        turnaround: {
          q: "كم تستغرق المدة؟",
          a: "تُسلَّم باقة Apex Starter Campaign خلال 48 ساعة، وباقة Apex Conversion Pro خلال 3–5 أيام. تبدأ المدة عند اكتمال أمرين: وصول الدفع، واكتمال ملف الطلب بما فيه صور المنتج أو اللقطات أو عناصر الهوية التي نحتاجها. وإن أردت أسرع، خيارات التسليم السريع والأولوية تختصرها إلى 24 أو 12 ساعة في Starter، و48 أو 24 ساعة في Pro.",
        },
        revisions: {
          q: "هل تشمل الباقة تعديلات؟",
          a: "نعم — تعديل واحد في Starter وثلاثة في Pro. التعديل يشمل كل ما هو داخل الطلب الذي وافقت عليه: الإيقاع، النصوص الظاهرة، الموسيقى، ترتيب المشاهد، الألوان، وتغييرات نصية بسيطة. أما تغيير المنتج أو العرض أو الجمهور أو الفكرة بالكامل فهو عمل جديد يُسعَّر على حدة. تُرسَل طلبات التعديل خلال 7 أيام من التسليم.",
        },
        noScript: {
          q: "ماذا لو لم يكن لديّ سيناريو؟",
          a: "لست بحاجة إليه. كتابة السيناريو جزء من كل باقة — وهذا ما يغطّيه بند كتابة النصوص. أخبرنا بما تبيعه، ولمن، وما تريد أن يفعله المشاهد، وأي شيء تعرف أنه ينجح معك. نكتب الافتتاحية والسيناريو من ذلك ونرسلهما مع النسخة الأولى.",
        },
        noFootage: {
          q: "ماذا لو لم تكن لديّ لقطات فيديو؟",
          a: "نستطيع العمل من صور المنتج أو موقعك أو لقطات مرخّصة. في إعلانات أسلوب UGC، تكفي لقطات بسيطة بالهاتف للمنتج أثناء الاستعمال، وسنحدّد لك بالضبط ما تصوّره. وإن استعملنا لقطات مرخّصة، فالترخيص يغطّي الإعلانات التي نسلّمها لك فقط، وليس ترخيصاً منفصلاً لمشاريعك الأخرى.",
        },
        formats: {
          q: "ماذا أستلم فعلياً؟",
          a: "ملفات فيديو MP4 جاهزة للرفع، إضافة إلى النصوص الإعلانية مكتوبة. تُسلَّم باقة Pro بصيغتَي 9:16 و1:1 معاً، فتعمل الحملة نفسها على تيك توك وريلز وشورتس وميتا دون إعادة قصّ. وتُسلَّم Starter بصيغة 9:16.",
        },
        rights: {
          q: "لمن تعود ملكية الإعلانات؟",
          a: "لك، بمجرد اكتمال الدفع — حقوق تجارية كاملة، في أي سوق، وبلا حدّ زمني. نحتفظ نحن بملفات المشروع وبقوالبنا وأساليبنا. وقد نعرض العمل النهائي ضمن أعمالنا ما لم تطلب خطياً خلاف ذلك.",
        },
        results: {
          q: "هل تضمنون النتائج؟",
          a: "لا، واحذر ممّن يضمنها. نحن نتحكّم في الجانب الإبداعي؛ أما نتائجك فتعتمد أيضاً على عرضك وسعرك وصفحة الهبوط والاستهداف والميزانية. ما نضمنه هو مطابقة العمل للطلب الذي وافقت عليه، ونواصل التعديل حتى يطابقه.",
        },
        refunds: {
          q: "هل يمكنني استرجاع المبلغ؟",
          a: "قبل بدء الإنتاج: نعم — استرجاع كامل، ناقص رسوم معالج الدفع. بعد بدء الإنتاج تصبح العملية نهائية، لأن العمل يُنتَج خصيصاً لك ولا يمكن إعادة بيعه. وإن كان هناك خلل في التسليم، فالتعديلات المشمولة هي وسيلة الإصلاح. التفاصيل الكاملة في",
        },
        payment: {
          q: "كيف أدفع؟",
          a: "عبر PayPal أو بالعملات الرقمية، كامل المبلغ، قبل بدء الإنتاج. الأسعار بالدولار الأمريكي. مدفوعات العملات الرقمية لا يمكن عكسها بعد تأكيدها على الشبكة، لذا تأكّد من الباقة وسرعة التسليم قبل الإرسال.",
        },
      },
    },
    footer: { terms: "شروط الخدمة", privacy: "سياسة الخصوصية", refund: "سياسة الاسترجاع" },
  },

  // =========================================================================
  // FRENCH
  // =========================================================================
  fr: {
    self: {
      eyebrow: "En autonomie",
      title: "Planification de contenu & stratégie professionnelles",
      sub: "Décrivez votre activité et obtenez un plan de contenu prêt à publier en quelques minutes. Vous pilotez l'outil vous-même.",
    },
    checkout: {
      eyebrow: "Paiement sécurisé",
      title: "Choisissez votre moyen de paiement",
      subtitle: "Sélectionnez un moyen de paiement : vous serez redirigé vers la page sécurisée du prestataire pour finaliser la commande.",
      card: "Payer par carte / PayPal",
      cardHint: "Visa, Mastercard, Amex, PayPal",
      crypto: "Payer en crypto",
      cryptoHint: "BTC, ETH, USDT et autres",
      soon: "Pas encore disponible",
      failed: "Impossible d'ouvrir le paiement par carte. Essayez la crypto, ou écrivez-nous et nous vous enverrons un lien de paiement.",
      close: "Fermer",
      orderNow: "Commander",
      upgrade: "Passer à l'offre supérieure",
      consent: "En continuant, vous confirmez que la production peut démarrer immédiatement et que vous avez lu notre",
      consentLink: "politique de remboursement",
    },
    plans: {
      free: "Gratuit",
      perMonth: "/mois",
    },
    pricing: {
      eyebrow: "Publicités vidéo professionnelles",
      title: "Publicités vidéo clés en main",
      sub: "Nous produisons vos publicités de A à Z — scénario, montage, voix off et textes inclus. Paiement unique, sans abonnement.",
      popular: "Le plus demandé",
      oneTime: "paiement unique",
      included: "Inclus",
      noRush: "Sans frais d'urgence — délai standard",
      basePlus: "{base} de base + {extra} {label}",
      speedLegend: "Délai de livraison",
      paypal: "Payer avec PayPal",
      crypto: "Payer en crypto",
      soon: "Lien de paiement bientôt disponible",
      consent: "En payant, vous confirmez que la production peut démarrer immédiatement et que vous avez lu notre",
      consentLink: "politique de remboursement",
      packages: {
        starter: {
          name: "Apex Starter Campaign",
          tagline: "Testez votre offre avec une seule publicité à forte conversion.",
          features: [
            "1 publicité vidéo à accroche optimisée (15–30 s)",
            "1 visuel publicitaire de reciblage",
            "Rédaction persuasive",
            "Voix off studio et musique premium",
            "1 révision",
            "Livraison en 48 heures",
          ],
        },
        pro: {
          name: "Apex Conversion Pro",
          tagline: "Une batterie de tests complète pour trouver votre création gagnante.",
          features: [
            "5 publicités vidéo : un produit avec 5 accroches (A/B testing), ou jusqu'à 5 produits, au choix",
            "3 visuels publicitaires avancés, pour un même produit ou des produits différents",
            "Rédaction marché approfondie et VFX",
            "Multi-format (9:16 et 1:1)",
            "3 révisions pour l'ensemble de la commande",
            "Livraison en 3–5 jours",
          ],
        },
      },
      speeds: {
        standard: "Livraison standard",
        express: "Livraison express",
        priority: "Livraison prioritaire",
      },
      details: {
        starter: { standard: "48 heures", express: "24 heures", priority: "12 heures" },
        pro: { standard: "3–5 jours", express: "48 heures", priority: "24 heures, équipe complète" },
      },
    },
    portfolio: {
      eyebrow: "Travaux récents",
      title: "Les formats que nous produisons",
      sub: "Des publicités courtes écrites et montées pour stopper le défilement dès les deux premières secondes, puis amener le spectateur à l'offre.",
      sampleSlot: "Emplacement à venir",
      items: {
        hookDemo: { title: "Démo produit avec accroche", format: "TikTok · 9:16" },
        ugc: { title: "Style témoignage UGC", format: "Reels · 9:16" },
        problem: { title: "Problème → solution", format: "Fil Meta · 1:1" },
        offer: { title: "Offre et clôture d'urgence", format: "Shorts · 9:16" },
      },
    },
    faq: {
      eyebrow: "Avant de commander",
      title: "Vos questions, nos réponses",
      sub: "Si quelque chose n'est pas clair, écrivez-nous avant de payer — pas après.",
      stillUnsure: "Encore un doute ?",
      refundLink: "politique de remboursement",
      items: {
        turnaround: {
          q: "Quel est le délai ?",
          a: "Apex Starter Campaign est livrée sous 48 heures et Apex Conversion Pro sous 3 à 5 jours. Le délai démarre lorsque deux conditions sont réunies : votre paiement est encaissé et votre brief est complet, y compris les photos produit, les rushes ou les éléments de marque dont nous avons besoin. Si vous êtes pressé, les options express et prioritaire ramènent ce délai à 24 ou 12 heures sur Starter, et à 48 ou 24 heures sur Pro.",
        },
        revisions: {
          q: "Les révisions sont-elles incluses ?",
          a: "Oui — une révision avec Starter, trois avec Pro. Une révision couvre tout ce qui entre dans le brief que vous avez validé : rythme, sous-titres, musique, ordre des plans, couleurs, petites corrections de texte. Changer le produit, l'offre, la cible ou le concept entier constitue un nouveau travail, devisé séparément. Les demandes de révision se font dans les 7 jours suivant la livraison.",
        },
        noScript: {
          q: "Et si je n'ai pas de script ?",
          a: "Vous n'en avez pas besoin. L'écriture du script fait partie de chaque formule — c'est ce que couvre la ligne rédaction. Dites-nous ce que vous vendez, à qui, ce que le spectateur doit faire, et ce qui fonctionne déjà chez vous. Nous écrivons l'accroche et le script à partir de là et vous les envoyons avec le premier montage.",
        },
        noFootage: {
          q: "Et si je n'ai aucune vidéo ?",
          a: "Nous pouvons travailler à partir de photos produit, de votre site ou de banques d'images sous licence. Pour les publicités de style UGC, quelques plans simples filmés au téléphone suffisent largement, et nous vous dirons exactement quoi filmer. Si nous utilisons des images sous licence, celle-ci couvre les publicités que nous vous livrons — ce n'est pas une licence distincte pour vos autres projets.",
        },
        formats: {
          q: "Que vais-je recevoir exactement ?",
          a: "Des fichiers vidéo MP4 prêts à être mis en ligne, ainsi que les textes publicitaires. Pro est livrée en 9:16 et en 1:1, afin que la même campagne tourne sur TikTok, Reels, Shorts et le fil Meta sans recadrage. Starter est livrée en 9:16.",
        },
        rights: {
          q: "À qui appartiennent les publicités ?",
          a: "À vous, dès le paiement intégral — droits commerciaux complets, tous marchés, sans limite de durée. Nous conservons les fichiers de projet ainsi que nos gabarits et méthodes. Nous pouvons présenter le travail final dans notre portfolio, sauf demande écrite contraire de votre part.",
        },
        results: {
          q: "Garantissez-vous des résultats ?",
          a: "Non, et méfiez-vous de qui le promet. Nous maîtrisons la création ; vos résultats dépendent aussi de votre offre, de votre prix, de votre page de destination, de votre ciblage et de votre budget. Ce que nous garantissons, c'est la conformité du travail au brief validé, et nous révisons jusqu'à ce qu'il le soit.",
        },
        refunds: {
          q: "Puis-je être remboursé ?",
          a: "Avant le démarrage de la production, oui — remboursement intégral, déduction faite des frais du prestataire de paiement. Une fois la production lancée, la vente est définitive, car le travail est réalisé sur mesure et ne peut être revendu. En cas de problème sur la livraison, les révisions incluses sont le moyen de le corriger. Tous les détails figurent dans notre",
        },
        payment: {
          q: "Comment puis-je payer ?",
          a: "Par PayPal ou en cryptomonnaie, intégralement, avant le démarrage de la production. Les prix sont en dollars américains. Les paiements en crypto sont irréversibles une fois confirmés sur la blockchain : vérifiez la formule et le délai avant d'envoyer.",
        },
      },
    },
    footer: {
      terms: "Conditions d'utilisation",
      privacy: "Politique de confidentialité",
      refund: "Politique de remboursement",
    },
  },

  // =========================================================================
  // SPANISH
  // =========================================================================
  es: {
    self: {
      eyebrow: "Autoservicio",
      title: "Planificación de contenido y estrategia profesional",
      sub: "Describe tu negocio y obtén un plan de contenido listo para publicar en minutos. La herramienta la manejas tú.",
    },
    checkout: {
      eyebrow: "Pago seguro",
      title: "Elige cómo pagar",
      subtitle: "Selecciona un método de pago: te llevaremos a la página segura del proveedor para completar el pedido.",
      card: "Pagar con tarjeta / PayPal",
      cardHint: "Visa, Mastercard, Amex, PayPal",
      crypto: "Pagar con cripto",
      cryptoHint: "BTC, ETH, USDT y más",
      soon: "Aún no disponible",
      failed: "No hemos podido abrir el pago con tarjeta. Prueba con cripto, o escríbenos y te enviaremos un enlace de pago.",
      close: "Cerrar",
      orderNow: "Pedir ahora",
      upgrade: "Mejorar plan",
      consent: "Al continuar confirmas que la producción puede comenzar de inmediato y que has leído nuestra",
      consentLink: "política de reembolso",
    },
    plans: {
      free: "Gratis",
      perMonth: "/mes",
    },
    pricing: {
      eyebrow: "Anuncios de vídeo profesionales",
      title: "Anuncios en vídeo llave en mano",
      sub: "Producimos tus anuncios desde cero: guion, edición, locución y textos incluidos. Pago único, sin suscripción.",
      popular: "El más solicitado",
      oneTime: "pago único",
      included: "Incluido",
      noRush: "Sin recargo por urgencia — plazo estándar",
      basePlus: "{base} base + {extra} {label}",
      speedLegend: "Plazo de entrega",
      paypal: "Pagar con PayPal",
      crypto: "Pagar con cripto",
      soon: "Enlace de pago disponible en breve",
      consent: "Al pagar confirmas que la producción puede comenzar de inmediato y que has leído nuestra",
      consentLink: "política de reembolso",
      packages: {
        starter: {
          name: "Apex Starter Campaign",
          tagline: "Pon a prueba tu oferta con un solo anuncio de alta conversión.",
          features: [
            "1 anuncio en vídeo con gancho optimizado (15–30 s)",
            "1 creatividad de retargeting",
            "Redacción persuasiva",
            "Locución de estudio y música premium",
            "1 revisión",
            "Entrega en 48 horas",
          ],
        },
        pro: {
          name: "Apex Conversion Pro",
          tagline: "Un set completo de pruebas para encontrar tu creatividad ganadora.",
          features: [
            "5 anuncios en vídeo: un producto con 5 ganchos (test A/B) o hasta 5 productos, tú eliges",
            "3 creatividades publicitarias avanzadas, para un mismo producto o para productos distintos",
            "Redacción de mercado en profundidad y VFX",
            "Multiformato (9:16 y 1:1)",
            "3 revisiones para todo el pedido",
            "Entrega en 3–5 días",
          ],
        },
      },
      speeds: {
        standard: "Entrega estándar",
        express: "Entrega exprés",
        priority: "Entrega prioritaria",
      },
      details: {
        starter: { standard: "48 horas", express: "24 horas", priority: "12 horas" },
        pro: { standard: "3–5 días", express: "48 horas", priority: "24 horas, equipo completo" },
      },
    },
    portfolio: {
      eyebrow: "Trabajos recientes",
      title: "Los formatos que producimos",
      sub: "Anuncios cortos escritos y editados para detener el scroll en los dos primeros segundos y llevar al espectador hasta la oferta.",
      sampleSlot: "Espacio disponible",
      items: {
        hookDemo: { title: "Demo de producto con gancho", format: "TikTok · 9:16" },
        ugc: { title: "Estilo testimonio UGC", format: "Reels · 9:16" },
        problem: { title: "Problema → solución", format: "Feed de Meta · 1:1" },
        offer: { title: "Oferta y cierre con urgencia", format: "Shorts · 9:16" },
      },
    },
    faq: {
      eyebrow: "Antes de pedir",
      title: "Preguntas, resueltas",
      sub: "Si algo no queda claro, escríbenos antes de pagar, no después.",
      stillUnsure: "¿Sigues con dudas?",
      refundLink: "política de reembolso",
      items: {
        turnaround: {
          q: "¿Cuánto tarda?",
          a: "Apex Starter Campaign se entrega en 48 horas y Apex Conversion Pro en 3–5 días. El plazo empieza cuando se cumplen dos cosas: tu pago se ha confirmado y tu brief está completo, incluidas las fotos de producto, el material grabado o los elementos de marca que necesitemos. Si tienes prisa, las opciones exprés y prioritaria lo reducen a 24 o 12 horas en Starter, y a 48 o 24 horas en Pro.",
        },
        revisions: {
          q: "¿Incluye revisiones?",
          a: "Sí: una revisión con Starter y tres con Pro. Una revisión cubre todo lo que está dentro del brief que aprobaste: ritmo, subtítulos, música, orden de las escenas, color y cambios menores de texto. Cambiar el producto, la oferta, el público o el concepto entero es trabajo nuevo y se presupuesta aparte. Envía las peticiones de revisión dentro de los 7 días siguientes a la entrega.",
        },
        noScript: {
          q: "¿Y si no tengo guion?",
          a: "No hace falta. Escribir el guion forma parte de cada paquete: es lo que cubre la línea de redacción. Cuéntanos qué vendes, a quién, qué quieres que haga el espectador y qué sabes que ya te funciona. A partir de ahí escribimos el gancho y el guion, y te los enviamos con el primer montaje.",
        },
        noFootage: {
          q: "¿Y si no tengo material grabado?",
          a: "Podemos trabajar con fotos de producto, tu web o material de archivo con licencia. En los anuncios estilo UGC, unas tomas sencillas con el móvil del producto en uso dan mucho juego, y te diremos exactamente qué grabar. Si usamos material con licencia, esta cubre los anuncios que te entregamos; no es una licencia aparte para tus otros proyectos.",
        },
        formats: {
          q: "¿Qué recibo exactamente?",
          a: "Archivos de vídeo MP4 listos para subir, más los textos publicitarios. Pro se entrega en 9:16 y en 1:1, de modo que la misma campaña funciona en TikTok, Reels, Shorts y el feed de Meta sin recortar. Starter se entrega en 9:16.",
        },
        rights: {
          q: "¿De quién son los anuncios?",
          a: "Tuyos, una vez completado el pago: derechos comerciales plenos, en cualquier mercado y sin límite de tiempo. Nosotros conservamos los archivos de proyecto y nuestras plantillas y métodos. Podemos mostrar el trabajo terminado en nuestro portfolio, salvo que nos pidas por escrito lo contrario.",
        },
        results: {
          q: "¿Garantizáis resultados?",
          a: "No, y desconfía de quien lo haga. Nosotros controlamos la creatividad; tus resultados dependen también de tu oferta, tu precio, tu landing, tu segmentación y tu presupuesto. Lo que sí garantizamos es que el trabajo se ajuste al brief aprobado, y revisamos hasta que así sea.",
        },
        refunds: {
          q: "¿Puedo pedir un reembolso?",
          a: "Antes de que empiece la producción, sí: reembolso íntegro menos la comisión de la pasarela de pago. Una vez iniciada la producción la venta es firme, porque el trabajo se hace a medida para ti y no puede revenderse. Si hay algún problema con la entrega, las revisiones incluidas son la vía para corregirlo. Todos los detalles están en nuestra",
        },
        payment: {
          q: "¿Cómo se paga?",
          a: "Con PayPal o criptomoneda, el importe completo, antes de empezar la producción. Los precios están en dólares estadounidenses. Los pagos en cripto no se pueden revertir una vez confirmados en la cadena, así que comprueba el paquete y el plazo antes de enviar.",
        },
      },
    },
    footer: {
      terms: "Términos del servicio",
      privacy: "Política de privacidad",
      refund: "Política de reembolso",
    },
  },

  // =========================================================================
  // ITALIAN
  // =========================================================================
  it: {
    self: {
      eyebrow: "In autonomia",
      title: "Pianificazione dei contenuti e strategia professionale",
      sub: "Descrivi la tua attività e ottieni un piano editoriale pronto da pubblicare in pochi minuti. Lo strumento lo usi tu.",
    },
    checkout: {
      eyebrow: "Pagamento sicuro",
      title: "Scegli come pagare",
      subtitle: "Seleziona un metodo di pagamento: ti porteremo alla pagina sicura del fornitore per completare l'ordine.",
      card: "Paga con carta / PayPal",
      cardHint: "Visa, Mastercard, Amex, PayPal",
      crypto: "Paga in cripto",
      cryptoHint: "BTC, ETH, USDT e altri",
      soon: "Non ancora disponibile",
      failed: "Non è stato possibile aprire il pagamento con carta. Prova con le cripto, oppure scrivici e ti invieremo un link di pagamento.",
      close: "Chiudi",
      orderNow: "Ordina ora",
      upgrade: "Passa al piano superiore",
      consent: "Continuando confermi che la produzione può iniziare subito e di aver letto la nostra",
      consentLink: "politica di rimborso",
    },
    plans: {
      free: "Gratuito",
      perMonth: "/mese",
    },
    pricing: {
      eyebrow: "Annunci video professionali",
      title: "Video pubblicitari chiavi in mano",
      sub: "Produciamo noi i tuoi annunci da zero: sceneggiatura, montaggio, voce fuori campo e testi inclusi. Pagamento unico, senza abbonamento.",
      popular: "Il più richiesto",
      oneTime: "pagamento unico",
      included: "Incluso",
      noRush: "Nessun supplemento urgenza — tempi standard",
      basePlus: "{base} base + {extra} {label}",
      speedLegend: "Tempi di consegna",
      paypal: "Paga con PayPal",
      crypto: "Paga in cripto",
      soon: "Link di pagamento in arrivo",
      consent: "Pagando confermi che la produzione può iniziare subito e di aver letto la nostra",
      consentLink: "politica di rimborso",
      packages: {
        starter: {
          name: "Apex Starter Campaign",
          tagline: "Metti alla prova la tua offerta con un solo annuncio ad alta conversione.",
          features: [
            "1 video pubblicitario con hook ottimizzato (15–30 s)",
            "1 creatività per il retargeting",
            "Copywriting persuasivo",
            "Voce fuori campo da studio e musica premium",
            "1 revisione",
            "Consegna in 48 ore",
          ],
        },
        pro: {
          name: "Apex Conversion Pro",
          tagline: "Un set completo di test per trovare la creatività vincente.",
          features: [
            "5 video pubblicitari: un prodotto con 5 hook (A/B test) o fino a 5 prodotti, a tua scelta",
            "3 creatività pubblicitarie avanzate, per lo stesso prodotto o per prodotti diversi",
            "Copywriting di mercato approfondito e VFX",
            "Multiformato (9:16 e 1:1)",
            "3 revisioni per l'intero ordine",
            "Consegna in 3–5 giorni",
          ],
        },
      },
      speeds: {
        standard: "Consegna standard",
        express: "Consegna express",
        priority: "Consegna prioritaria",
      },
      details: {
        starter: { standard: "48 ore", express: "24 ore", priority: "12 ore" },
        pro: { standard: "3–5 giorni", express: "48 ore", priority: "24 ore, team completo" },
      },
    },
    portfolio: {
      eyebrow: "Lavori recenti",
      title: "I formati che realizziamo",
      sub: "Annunci brevi scritti e montati per fermare lo scroll nei primi due secondi e accompagnare lo spettatore fino all'offerta.",
      sampleSlot: "Spazio disponibile",
      items: {
        hookDemo: { title: "Demo prodotto con hook", format: "TikTok · 9:16" },
        ugc: { title: "Stile testimonianza UGC", format: "Reels · 9:16" },
        problem: { title: "Problema → soluzione", format: "Feed Meta · 1:1" },
        offer: { title: "Offerta e chiusura d'urgenza", format: "Shorts · 9:16" },
      },
    },
    faq: {
      eyebrow: "Prima di ordinare",
      title: "Domande, con risposta",
      sub: "Se qualcosa non è chiaro, scrivici prima di pagare — non dopo.",
      stillUnsure: "Hai ancora dubbi?",
      refundLink: "politica di rimborso",
      items: {
        turnaround: {
          q: "Quanto tempo serve?",
          a: "Apex Starter Campaign viene consegnata entro 48 ore e Apex Conversion Pro entro 3–5 giorni. Il conteggio parte quando si verificano due cose: il pagamento è andato a buon fine e il brief è completo, comprese le foto prodotto, il girato o gli elementi di brand che ci servono. Se hai fretta, le opzioni express e prioritaria riducono i tempi a 24 o 12 ore su Starter e a 48 o 24 ore su Pro.",
        },
        revisions: {
          q: "Sono incluse le revisioni?",
          a: "Sì: una revisione con Starter, tre con Pro. Una revisione copre tutto ciò che rientra nel brief approvato: ritmo, sottotitoli, musica, ordine delle scene, colore e piccole modifiche ai testi. Cambiare prodotto, offerta, pubblico o l'intero concept è lavoro nuovo e viene preventivato a parte. Le richieste di revisione vanno inviate entro 7 giorni dalla consegna.",
        },
        noScript: {
          q: "E se non ho una sceneggiatura?",
          a: "Non serve. La scrittura fa parte di ogni pacchetto: è ciò che copre la voce copywriting. Raccontaci cosa vendi, a chi, cosa vuoi che faccia lo spettatore e cosa sai già che funziona. Da lì scriviamo l'hook e la sceneggiatura e te li inviamo con il primo montaggio.",
        },
        noFootage: {
          q: "E se non ho girato nulla?",
          a: "Possiamo lavorare con foto prodotto, il tuo sito o materiale stock su licenza. Per gli annunci in stile UGC bastano poche riprese semplici da smartphone del prodotto in uso, e ti diremo esattamente cosa filmare. Se usiamo materiale su licenza, questa copre gli annunci che ti consegniamo: non è una licenza separata per i tuoi altri progetti.",
        },
        formats: {
          q: "Che cosa ricevo esattamente?",
          a: "File video MP4 pronti da caricare, più i testi pubblicitari. Pro viene consegnata sia in 9:16 sia in 1:1, così la stessa campagna gira su TikTok, Reels, Shorts e sul feed Meta senza ritagli. Starter viene consegnata in 9:16.",
        },
        rights: {
          q: "A chi appartengono gli annunci?",
          a: "A te, una volta completato il pagamento: diritti commerciali pieni, su qualsiasi mercato e senza limiti di tempo. Noi conserviamo i file di progetto e i nostri template e metodi. Possiamo mostrare il lavoro finito nel nostro portfolio, salvo tua richiesta scritta contraria.",
        },
        results: {
          q: "Garantite i risultati?",
          a: "No, e diffida di chi lo fa. Noi controlliamo la creatività; i tuoi risultati dipendono anche da offerta, prezzo, landing page, targeting e budget. Quello che garantiamo è che il lavoro corrisponda al brief approvato, e revisioniamo finché non è così.",
        },
        refunds: {
          q: "Posso chiedere un rimborso?",
          a: "Prima dell'inizio della produzione sì: rimborso integrale, al netto della commissione del processore di pagamento. Una volta avviata la produzione la vendita è definitiva, perché il lavoro è realizzato su misura per te e non è rivendibile. Se c'è un problema con la consegna, le revisioni incluse sono il modo per correggerlo. Tutti i dettagli sono nella nostra",
        },
        payment: {
          q: "Come si paga?",
          a: "Con PayPal o criptovaluta, per intero, prima dell'inizio della produzione. I prezzi sono in dollari statunitensi. I pagamenti in cripto non sono reversibili una volta confermati sulla blockchain: verifica pacchetto e tempi di consegna prima di inviare.",
        },
      },
    },
    footer: {
      terms: "Termini di servizio",
      privacy: "Informativa sulla privacy",
      refund: "Politica di rimborso",
    },
  },
};

// ---------------------------------------------------------------------------
// CURRENT OFFER (three one-time packages: $49 / $200 / $500).
//
// The blocks below replace, for every language, the pricing texts, the package
// descriptions and the FAQ answers defined above. They are applied at the bottom
// of this section, so the older package texts above (Starter / Conversion Pro,
// revisions, "sale is final") are no longer shown anywhere.
//
// Keep these in step with Pricing.js, PublicLanding.js and the static pages in
// public/pricing, public/terms and public/refund (14-day refund, Paddle as
// Merchant of Record, landing pages hosted for 90 days).
// Package names are trade names and stay in English in every language.
// ---------------------------------------------------------------------------
const CURRENT_OFFER = {
  en: {
    pricing: {
      eyebrow: "Professional Video Ads",
      title: "Video Ad Packages",
      sub: "Upload your product photos and choose a package. Our automated pipeline produces your ad assets. One-time payment per package, no subscription.",
      notIncluded: "Not included",
    },
    packages: {
      single: {
        name: "Apex Single Hook",
        tagline: "One video ad to test a product or an angle before you commit.",
        features: ["1 raw video ad: 1 hook, 15–20 seconds", "Delivered by download link"],
        excluded: ["No landing page", "No social media designs", "No ad copy"],
      },
      funnel: {
        name: "Apex Conversion Funnel",
        tagline: "The full ready-to-launch funnel for one product.",
        features: [
          "2 video ads with different hooks for A/B testing",
          "2 social ad designs",
          "Full ad copy",
          "1 landing page with your video and an order form built in, hosted for 90 days",
        ],
      },
      scaler: {
        name: "Apex Multi-Product Scaler",
        tagline: "Two products, each with its own ads and its own landing page.",
        features: [
          "4 video ads: 2 per product",
          "4 social ad designs",
          "2 independent landing pages, one per product, hosted for 90 days",
          "Competitor strategy summary",
        ],
      },
    },
    faq: {
      turnaround: {
        q: "How long does it take?",
        a: "Generation is automated. It starts once your payment is confirmed and your product photos and details are complete. We aim to deliver within 24 hours; this is an estimate, not a guarantee.",
      },
      revisions: {
        q: "What if something is wrong with my files?",
        a: "If a deliverable has a technical fault, such as a file that will not open, a damaged clip or a landing page that does not load, tell us and we regenerate it at no cost. If you are not satisfied, our 14-day refund policy applies.",
      },
      noScript: {
        q: "Do I need to write a script or a brief?",
        a: "No. You upload product photos and give the product name, the voiceover language, the voice and an optional offer. The software writes the hook and the script and plans every scene from your photos.",
      },
      noFootage: {
        q: "What do I need to provide?",
        a: "Clear product photos (JPG or PNG, at least 1000 px). No video footage is needed. Please do not upload photos that show identifiable people.",
      },
      formats: {
        q: "What do I actually receive?",
        a: "Vertical 9:16 video ads as MP4 files. The Conversion Funnel and Multi-Product Scaler packages add ad designs, ad copy and hosted landing pages that stay online for 90 days. Delivery is digital, by download link or hosted URL.",
      },
      rights: {
        q: "Who owns the output?",
        a: "Once your order is paid, you can use the delivered assets for your own business and advertising, worldwide and with no time limit. We keep the rights to the software itself.",
      },
      results: {
        q: "Do you guarantee results?",
        a: "No. The assets are generated automatically and can contain imperfections, so review them before you publish. Results also depend on your offer, price, targeting and budget.",
      },
      refunds: {
        q: "Can I get a refund?",
        a: "Yes. You can request a refund within 14 days of purchase. Refunds are handled by Paddle, our payment provider. Full details are in our",
      },
      payment: {
        q: "How do I pay?",
        a: "By card or the other methods offered at checkout. Payments are processed by Paddle, our Merchant of Record. Prices are in US dollars and taxes are calculated at checkout.",
      },
    },
  },

  ar: {
    pricing: {
      eyebrow: "إعلانات فيديو احترافية",
      title: "باقات إعلانات الفيديو",
      sub: "ارفع صور منتجك واختر الباقة، ونظامنا الآلي ينتج موادك الإعلانية. دفعة واحدة لكل باقة، بلا اشتراك.",
      notIncluded: "غير مشمول",
    },
    packages: {
      single: {
        name: "Apex Single Hook",
        tagline: "إعلان فيديو واحد لاختبار منتج أو زاوية قبل أن تلتزم.",
        features: ["إعلان فيديو خام واحد: افتتاحية واحدة، 15–20 ثانية", "التسليم عبر رابط تحميل"],
        excluded: ["بدون صفحة هبوط", "بدون تصاميم لوسائل التواصل", "بدون نص إعلاني"],
      },
      funnel: {
        name: "Apex Conversion Funnel",
        tagline: "القمع الكامل الجاهز للإطلاق لمنتج واحد.",
        features: [
          "إعلانا فيديو بافتتاحيتين مختلفتين لاختبار A/B",
          "تصميمان إعلانيان لوسائل التواصل",
          "نص إعلاني كامل",
          "صفحة هبوط واحدة تتضمن الفيديو ونموذج طلب، مستضافة لمدة 90 يوماً",
        ],
      },
      scaler: {
        name: "Apex Multi-Product Scaler",
        tagline: "منتجان، لكل منهما إعلاناته وصفحة هبوطه.",
        features: [
          "4 إعلانات فيديو: 2 لكل منتج",
          "4 تصاميم إعلانية لوسائل التواصل",
          "صفحتا هبوط مستقلتان، واحدة لكل منتج، مستضافتان لمدة 90 يوماً",
          "ملخص لاستراتيجية المنافسين",
        ],
      },
    },
    faq: {
      turnaround: {
        q: "كم يستغرق التنفيذ؟",
        a: "التوليد آلي. يبدأ فور تأكيد الدفع واكتمال صور منتجك وبياناته. نهدف إلى التسليم خلال 24 ساعة، وهذه مدة تقديرية وليست ضماناً.",
      },
      revisions: {
        q: "ماذا لو كان في ملفاتي خلل؟",
        a: "إذا كان في أحد الملفات خلل تقني، كملف لا يفتح أو مقطع تالف أو صفحة هبوط لا تعمل، أخبرنا ونعيد توليده مجاناً. وإن لم تكن راضياً، تنطبق سياسة الاسترجاع خلال 14 يوماً.",
      },
      noScript: {
        q: "هل أحتاج إلى كتابة سكريبت أو وصف؟",
        a: "لا. ترفع صور المنتج وتذكر اسمه ولغة التعليق الصوتي ونوع الصوت وعرضاً اختيارياً. البرنامج يكتب الافتتاحية والسكريبت ويخطط كل مشهد انطلاقاً من صورك.",
      },
      noFootage: {
        q: "ما الذي يجب أن أقدّمه؟",
        a: "صوراً واضحة للمنتج (JPG أو PNG، 1000 بكسل على الأقل). لا حاجة إلى أي مقاطع فيديو. يُرجى عدم رفع صور يظهر فيها أشخاص يمكن التعرف عليهم.",
      },
      formats: {
        q: "ماذا أستلم بالضبط؟",
        a: "إعلانات فيديو عمودية 9:16 بصيغة MP4. تضيف باقتا Conversion Funnel و Multi-Product Scaler تصاميم إعلانية ونصاً إعلانياً وصفحات هبوط مستضافة تبقى متاحة 90 يوماً. التسليم رقمي عبر رابط تحميل أو رابط مستضاف.",
      },
      rights: {
        q: "من يملك المواد؟",
        a: "بعد سداد الطلب، يحق لك استخدام المواد المسلَّمة في نشاطك وإعلاناتك، في أي بلد وبلا حد زمني. ونحتفظ نحن بحقوق البرنامج نفسه.",
      },
      results: {
        q: "هل تضمنون النتائج؟",
        a: "لا. المواد تُولَّد آلياً وقد تحتوي على عيوب، لذا راجعها قبل النشر. والنتائج تعتمد أيضاً على عرضك وسعرك واستهدافك وميزانيتك.",
      },
      refunds: {
        q: "هل يمكنني استرجاع أموالي؟",
        a: "نعم. يمكنك طلب الاسترجاع خلال 14 يوماً من تاريخ الشراء. تتولى Paddle، مزوّد الدفع لدينا، معالجة الاسترجاع. التفاصيل الكاملة في",
      },
      payment: {
        q: "كيف أدفع؟",
        a: "بالبطاقة أو بوسائل الدفع الأخرى المتاحة عند إتمام الطلب. تُعالَج المدفوعات عبر Paddle بصفتها التاجر المسجَّل (Merchant of Record). الأسعار بالدولار الأمريكي وتُحتسب الضرائب عند الدفع.",
      },
    },
  },

  fr: {
    pricing: {
      eyebrow: "Publicités vidéo professionnelles",
      title: "Forfaits publicités vidéo",
      sub: "Importez les photos de votre produit et choisissez un forfait. Notre pipeline automatisé produit vos supports publicitaires. Paiement unique par forfait, sans abonnement.",
      notIncluded: "Non inclus",
    },
    packages: {
      single: {
        name: "Apex Single Hook",
        tagline: "Une publicité vidéo pour tester un produit ou un angle avant de vous engager.",
        features: ["1 publicité vidéo brute : 1 accroche, 15–20 secondes", "Livraison par lien de téléchargement"],
        excluded: ["Pas de page de destination", "Pas de visuels pour les réseaux sociaux", "Pas de texte publicitaire"],
      },
      funnel: {
        name: "Apex Conversion Funnel",
        tagline: "Le tunnel complet, prêt à lancer, pour un produit.",
        features: [
          "2 publicités vidéo avec des accroches différentes pour l'A/B testing",
          "2 visuels publicitaires pour les réseaux sociaux",
          "Texte publicitaire complet",
          "1 page de destination avec votre vidéo et un formulaire de commande intégré, hébergée 90 jours",
        ],
      },
      scaler: {
        name: "Apex Multi-Product Scaler",
        tagline: "Deux produits, chacun avec ses publicités et sa page de destination.",
        features: [
          "4 publicités vidéo : 2 par produit",
          "4 visuels publicitaires pour les réseaux sociaux",
          "2 pages de destination indépendantes, une par produit, hébergées 90 jours",
          "Synthèse de la stratégie des concurrents",
        ],
      },
    },
    faq: {
      turnaround: {
        q: "Combien de temps faut-il ?",
        a: "La génération est automatisée. Elle démarre dès que votre paiement est confirmé et que vos photos et informations produit sont complètes. Nous visons une livraison sous 24 heures ; c'est une estimation, pas une garantie.",
      },
      revisions: {
        q: "Et si un fichier pose problème ?",
        a: "Si un livrable présente un défaut technique (fichier qui ne s'ouvre pas, clip endommagé, page de destination inaccessible), dites-le-nous et nous le régénérons gratuitement. Si vous n'êtes pas satisfait, notre politique de remboursement de 14 jours s'applique.",
      },
      noScript: {
        q: "Dois-je écrire un script ou un brief ?",
        a: "Non. Vous importez les photos du produit et indiquez son nom, la langue de la voix off, la voix et une offre facultative. Le logiciel écrit l'accroche et le script, et conçoit chaque scène à partir de vos photos.",
      },
      noFootage: {
        q: "Que dois-je fournir ?",
        a: "Des photos nettes du produit (JPG ou PNG, 1000 px minimum). Aucune séquence vidéo n'est nécessaire. Merci de ne pas importer de photos montrant des personnes identifiables.",
      },
      formats: {
        q: "Que vais-je recevoir ?",
        a: "Des publicités vidéo verticales 9:16 au format MP4. Les forfaits Conversion Funnel et Multi-Product Scaler ajoutent des visuels publicitaires, le texte publicitaire et des pages de destination hébergées pendant 90 jours. La livraison est numérique, par lien de téléchargement ou URL hébergée.",
      },
      rights: {
        q: "À qui appartiennent les contenus ?",
        a: "Une fois la commande payée, vous pouvez utiliser les contenus livrés pour votre activité et vos publicités, dans le monde entier et sans limite de durée. Nous conservons les droits sur le logiciel lui-même.",
      },
      results: {
        q: "Garantissez-vous des résultats ?",
        a: "Non. Les contenus sont générés automatiquement et peuvent comporter des imperfections : vérifiez-les avant de les publier. Les résultats dépendent aussi de votre offre, de votre prix, de votre ciblage et de votre budget.",
      },
      refunds: {
        q: "Puis-je être remboursé ?",
        a: "Oui. Vous pouvez demander un remboursement dans les 14 jours suivant l'achat. Les remboursements sont traités par Paddle, notre prestataire de paiement. Tous les détails figurent dans notre",
      },
      payment: {
        q: "Comment payer ?",
        a: "Par carte ou par les autres moyens proposés au moment du paiement. Les paiements sont traités par Paddle, notre revendeur officiel (Merchant of Record). Les prix sont en dollars américains et les taxes sont calculées au moment du paiement.",
      },
    },
  },

  es: {
    pricing: {
      eyebrow: "Anuncios de vídeo profesionales",
      title: "Paquetes de anuncios en vídeo",
      sub: "Sube las fotos de tu producto y elige un paquete. Nuestro sistema automatizado produce tus materiales publicitarios. Pago único por paquete, sin suscripción.",
      notIncluded: "No incluido",
    },
    packages: {
      single: {
        name: "Apex Single Hook",
        tagline: "Un anuncio en vídeo para probar un producto o un enfoque antes de comprometerte.",
        features: ["1 anuncio en vídeo en bruto: 1 gancho, 15–20 segundos", "Entrega mediante enlace de descarga"],
        excluded: ["Sin página de destino", "Sin diseños para redes sociales", "Sin texto publicitario"],
      },
      funnel: {
        name: "Apex Conversion Funnel",
        tagline: "El embudo completo, listo para lanzar, para un producto.",
        features: [
          "2 anuncios en vídeo con ganchos distintos para test A/B",
          "2 diseños publicitarios para redes sociales",
          "Texto publicitario completo",
          "1 página de destino con tu vídeo y un formulario de pedido integrado, alojada durante 90 días",
        ],
      },
      scaler: {
        name: "Apex Multi-Product Scaler",
        tagline: "Dos productos, cada uno con sus anuncios y su propia página de destino.",
        features: [
          "4 anuncios en vídeo: 2 por producto",
          "4 diseños publicitarios para redes sociales",
          "2 páginas de destino independientes, una por producto, alojadas durante 90 días",
          "Resumen de la estrategia de la competencia",
        ],
      },
    },
    faq: {
      turnaround: {
        q: "¿Cuánto tarda?",
        a: "La generación es automática. Empieza cuando tu pago está confirmado y las fotos y los datos de tu producto están completos. Nuestro objetivo es entregar en 24 horas; es una estimación, no una garantía.",
      },
      revisions: {
        q: "¿Y si hay un problema con mis archivos?",
        a: "Si un entregable tiene un fallo técnico (un archivo que no se abre, un clip dañado, una página de destino que no carga), avísanos y lo regeneramos sin coste. Si no quedas satisfecho, se aplica nuestra política de reembolso de 14 días.",
      },
      noScript: {
        q: "¿Tengo que escribir un guion o un briefing?",
        a: "No. Subes las fotos del producto e indicas su nombre, el idioma de la locución, la voz y una oferta opcional. El software escribe el gancho y el guion, y planifica cada escena a partir de tus fotos.",
      },
      noFootage: {
        q: "¿Qué tengo que aportar?",
        a: "Fotos nítidas del producto (JPG o PNG, mínimo 1000 px). No hace falta ningún vídeo. Por favor, no subas fotos en las que aparezcan personas identificables.",
      },
      formats: {
        q: "¿Qué recibo exactamente?",
        a: "Anuncios en vídeo verticales 9:16 en formato MP4. Los paquetes Conversion Funnel y Multi-Product Scaler añaden diseños publicitarios, texto publicitario y páginas de destino alojadas durante 90 días. La entrega es digital, mediante enlace de descarga o URL alojada.",
      },
      rights: {
        q: "¿De quién son los materiales?",
        a: "Una vez pagado el pedido, puedes usar los materiales entregados en tu negocio y tu publicidad, en todo el mundo y sin límite de tiempo. Nosotros conservamos los derechos sobre el software.",
      },
      results: {
        q: "¿Garantizáis resultados?",
        a: "No. Los materiales se generan automáticamente y pueden tener imperfecciones, así que revísalos antes de publicarlos. Los resultados dependen también de tu oferta, tu precio, tu segmentación y tu presupuesto.",
      },
      refunds: {
        q: "¿Puedo pedir un reembolso?",
        a: "Sí. Puedes solicitar un reembolso dentro de los 14 días posteriores a la compra. Los reembolsos los gestiona Paddle, nuestro proveedor de pagos. Todos los detalles están en nuestra",
      },
      payment: {
        q: "¿Cómo pago?",
        a: "Con tarjeta o con los demás métodos disponibles en el pago. Los pagos los procesa Paddle, nuestro comerciante registrado (Merchant of Record). Los precios están en dólares estadounidenses y los impuestos se calculan en el pago.",
      },
    },
  },

  it: {
    pricing: {
      eyebrow: "Annunci video professionali",
      title: "Pacchetti di annunci video",
      sub: "Carica le foto del tuo prodotto e scegli un pacchetto. Il nostro sistema automatizzato produce i tuoi materiali pubblicitari. Pagamento unico per pacchetto, senza abbonamento.",
      notIncluded: "Non incluso",
    },
    packages: {
      single: {
        name: "Apex Single Hook",
        tagline: "Un annuncio video per testare un prodotto o un angolo prima di impegnarti.",
        features: ["1 annuncio video grezzo: 1 hook, 15–20 secondi", "Consegna tramite link di download"],
        excluded: ["Nessuna landing page", "Nessuna grafica per i social", "Nessun testo pubblicitario"],
      },
      funnel: {
        name: "Apex Conversion Funnel",
        tagline: "Il funnel completo, pronto al lancio, per un prodotto.",
        features: [
          "2 annunci video con hook diversi per A/B test",
          "2 grafiche pubblicitarie per i social",
          "Testo pubblicitario completo",
          "1 landing page con il tuo video e un modulo d'ordine integrato, ospitata per 90 giorni",
        ],
      },
      scaler: {
        name: "Apex Multi-Product Scaler",
        tagline: "Due prodotti, ciascuno con i propri annunci e la propria landing page.",
        features: [
          "4 annunci video: 2 per prodotto",
          "4 grafiche pubblicitarie per i social",
          "2 landing page indipendenti, una per prodotto, ospitate per 90 giorni",
          "Sintesi della strategia dei concorrenti",
        ],
      },
    },
    faq: {
      turnaround: {
        q: "Quanto tempo ci vuole?",
        a: "La generazione è automatica. Parte quando il pagamento è confermato e le foto e i dati del prodotto sono completi. Puntiamo a consegnare entro 24 ore; è una stima, non una garanzia.",
      },
      revisions: {
        q: "E se c'è un problema con i miei file?",
        a: "Se un file ha un difetto tecnico (non si apre, una clip è danneggiata, una landing page non si carica), segnalacelo e lo rigeneriamo gratuitamente. Se non sei soddisfatto, si applica la nostra politica di rimborso di 14 giorni.",
      },
      noScript: {
        q: "Devo scrivere uno script o un brief?",
        a: "No. Carichi le foto del prodotto e indichi il nome, la lingua della voce fuori campo, la voce e un'offerta facoltativa. Il software scrive l'hook e lo script e pianifica ogni scena a partire dalle tue foto.",
      },
      noFootage: {
        q: "Che cosa devo fornire?",
        a: "Foto nitide del prodotto (JPG o PNG, almeno 1000 px). Non servono riprese video. Ti chiediamo di non caricare foto con persone riconoscibili.",
      },
      formats: {
        q: "Che cosa ricevo esattamente?",
        a: "Annunci video verticali 9:16 in formato MP4. I pacchetti Conversion Funnel e Multi-Product Scaler aggiungono grafiche pubblicitarie, testo pubblicitario e landing page ospitate per 90 giorni. La consegna è digitale, tramite link di download o URL ospitato.",
      },
      rights: {
        q: "Di chi sono i materiali?",
        a: "Una volta pagato l'ordine, puoi usare i materiali consegnati per la tua attività e la tua pubblicità, in tutto il mondo e senza limiti di tempo. Noi manteniamo i diritti sul software.",
      },
      results: {
        q: "Garantite dei risultati?",
        a: "No. I materiali sono generati automaticamente e possono contenere imperfezioni, quindi controllali prima di pubblicarli. I risultati dipendono anche dalla tua offerta, dal prezzo, dal targeting e dal budget.",
      },
      refunds: {
        q: "Posso ottenere un rimborso?",
        a: "Sì. Puoi richiedere un rimborso entro 14 giorni dall'acquisto. I rimborsi sono gestiti da Paddle, il nostro fornitore di pagamenti. Tutti i dettagli sono nella nostra",
      },
      payment: {
        q: "Come pago?",
        a: "Con carta o con gli altri metodi disponibili al checkout. I pagamenti sono elaborati da Paddle, il nostro rivenditore ufficiale (Merchant of Record). I prezzi sono in dollari statunitensi e le imposte sono calcolate al checkout.",
      },
    },
  },
};

Object.keys(CURRENT_OFFER).forEach((code) => {
  const target = agencyTranslations[code];
  const offer = CURRENT_OFFER[code];
  if (!target || !offer) return;
  target.pricing = { ...target.pricing, ...offer.pricing, packages: offer.packages };
  target.faq = { ...target.faq, items: offer.faq };
});

// أسماء اللغات كما تظهر في مبدّل اللغة — تبقى بلغتها الأصلية دائماً (لا تُترجم)، حتى
// يتعرّف الزائر على لغته حتى لو كانت الواجهة الحالية بلغة لا يفهمها.
export const LANGUAGE_LABELS = {
  en: "EN",
  ar: "AR",
  fr: "FR",
  es: "ES",
  it: "IT",
};
