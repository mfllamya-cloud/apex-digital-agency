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
      title: "AI Content Planning & Strategy",
      sub: "Describe your business and get a ready-to-post content plan in minutes. Monthly plans, you run the tool yourself.",
    },
    pricing: {
      eyebrow: "Full Agency Service",
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
            "5 A/B Testing-Ready Video Ads",
            "3 Advanced Ad Creatives",
            "Deep Market Copywriting & VFX",
            "Multi-Format (9:16 & 1:1)",
            "3 Revisions",
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
      title: "تخطيط المحتوى والاستراتيجية بالذكاء الاصطناعي",
      sub: "صِف مشروعك واحصل على خطة محتوى جاهزة للنشر في دقائق. اشتراك شهري، وأنت من يشغّل الأداة بنفسك.",
    },
    pricing: {
      eyebrow: "خدمة الوكالة الكاملة",
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
            "5 إعلانات فيديو جاهزة لاختبار A/B",
            "3 تصاميم إعلانية متقدّمة",
            "كتابة تسويقية معمّقة ومؤثرات بصرية",
            "صيغ متعدّدة (9:16 و 1:1)",
            "3 تعديلات",
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
      title: "Planification de contenu & stratégie par IA",
      sub: "Décrivez votre activité et obtenez un plan de contenu prêt à publier en quelques minutes. Abonnement mensuel, vous pilotez l'outil vous-même.",
    },
    pricing: {
      eyebrow: "Service agence complet",
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
            "5 publicités vidéo prêtes pour l'A/B testing",
            "3 visuels publicitaires avancés",
            "Rédaction marché approfondie et VFX",
            "Multi-format (9:16 et 1:1)",
            "3 révisions",
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
      title: "Planificación de contenido y estrategia con IA",
      sub: "Describe tu negocio y obtén un plan de contenido listo para publicar en minutos. Planes mensuales; la herramienta la manejas tú.",
    },
    pricing: {
      eyebrow: "Servicio de agencia completo",
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
            "5 anuncios en vídeo listos para test A/B",
            "3 creatividades publicitarias avanzadas",
            "Redacción de mercado en profundidad y VFX",
            "Multiformato (9:16 y 1:1)",
            "3 revisiones",
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
      title: "Pianificazione dei contenuti e strategia con l'IA",
      sub: "Descrivi la tua attività e ottieni un piano editoriale pronto da pubblicare in pochi minuti. Piani mensili, lo strumento lo usi tu.",
    },
    pricing: {
      eyebrow: "Servizio agenzia completo",
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
            "5 video pubblicitari pronti per l'A/B test",
            "3 creatività pubblicitarie avanzate",
            "Copywriting di mercato approfondito e VFX",
            "Multiformato (9:16 e 1:1)",
            "3 revisioni",
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

// أسماء اللغات كما تظهر في مبدّل اللغة — تبقى بلغتها الأصلية دائماً (لا تُترجم)، حتى
// يتعرّف الزائر على لغته حتى لو كانت الواجهة الحالية بلغة لا يفهمها.
export const LANGUAGE_LABELS = {
  en: "EN",
  ar: "AR",
  fr: "FR",
  es: "ES",
  it: "IT",
};
