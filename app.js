
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// ==========================================
// 1. إعدادات الاتصال
// ==========================================

const API_URL = "https://script.google.com/macros/s/AKfycbyF5JihmoxmYeYD2v2lzA4cvPdbkPYCc35QziISCveazCN4ScBMFJ-e0Dl6gifWtoTf5w/exec";

const firebaseConfig = {
  apiKey: "AIzaSyDWXpZ2nxJpJ81sQCiiM6bO2SfkBp2zi5M",
  authDomain: "tell-professor-ai-ac46e.firebaseapp.com",
  projectId: "tell-professor-ai-ac46e",
  storageBucket: "tell-professor-ai-ac46e.firebasestorage.app",
  messagingSenderId: "332172483738",
  appId: "1:332172483738:web:e776431c904f1fa4821323",
  measurementId: "G-GFET594NSB"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// ==========================================
// 2. عناصر الصفحة
// ==========================================

const $ = (id) => document.getElementById(id);

const messages = $("messages");
const welcome = $("welcome");
const messageInput = $("messageInput");
const sendButton = $("sendButton");
const imageInput = $("imageInput");
const imagePreview = $("imagePreview");
const previewImage = $("previewImage");
const toast = $("toast");

let currentUser = null;
let selectedTool = "Chat";
let selectedImage = null;
let isSending = false;
let isRegisterMode = false;
let toastTimeout = null;

// ==========================================
// 3. رسائل التنبيه
// ==========================================

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

// ==========================================
// 4. أدوات المحادثة
// ==========================================

const toolNames = {
  Chat: "المحادثة",
  Vision: "تحليل الصور",
  Voice: "الصوت",
  Writer: "الكتابة",
  Translate: "الترجمة",
  Study: "المذاكرة",
  Summary: "التلخيص",
  Code: "البرمجة"
};

const toolPrompts = {
  Chat: "",
  Vision: "حلل الصورة المرفقة واشرح محتواها بالتفصيل وبطريقة واضحة. ",
  Voice: "",
  Writer: "تصرف ككاتب محترف وساعدني في الكتابة. ",
  Translate: "ترجم النص التالي ترجمة دقيقة مع الحفاظ على المعنى. ",
  Study: "تصرف كمدرس محترف واشرح لي بطريقة سهلة ومنظمة مع أمثلة. ",
  Summary: "لخص المحتوى التالي مع الحفاظ على أهم المعلومات. ",
  Code: "تصرف كمبرمج محترف واشرح الحل واكتب كودًا صحيحًا. "
};

document.querySelectorAll(".tool").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tool").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    selectedTool = button.dataset.tool;

    messageInput.placeholder =
      selectedTool === "Vision"
        ? "اكتب ما تريد معرفته عن الصورة..."
        : `اكتب رسالتك في ${toolNames[selectedTool]}...`;

    if (selectedTool === "Vision") {
      showToast("أرفق صورة للبدء في تحليلها");
    }
  });
});

// ==========================================
// 5. إظهار وإخفاء نافذة الحساب
// ==========================================

function openAuth() {
  $("authModal").classList.remove("hidden");
  $("authMessage").textContent = "";
}

function closeAuth() {
  $("authModal").classList.add("hidden");
  $("authMessage").textContent = "";
}

$("topLogin").addEventListener("click", openAuth);

$("accountButton").addEventListener("click", () => {
  if (currentUser) {
    signOut(auth).catch(error => {
      showToast("تعذر تسجيل الخروج: " + error.message);
    });
  } else {
    openAuth();
  }
});

$("closeAuth").addEventListener("click", closeAuth);

// ==========================================
// 6. تسجيل الدخول وإنشاء الحساب
// ==========================================

function setAuthMessage(message, isError = true) {
  const element = $("authMessage");
  element.textContent = message;
  element.style.color = isError ? "#ff7777" : "#75dfa4";
}

$("toggleAuth").addEventListener("click", () => {
  isRegisterMode = !isRegisterMode;

  $("authTitle").textContent =
    isRegisterMode ? "إنشاء حساب جديد" : "تسجيل الدخول";

  $("authDescription").textContent =
    isRegisterMode
      ? "أنشئ حسابك للاستفادة من خدمات Tell Professor AI."
      : "ادخل إلى حسابك للاستفادة من تحليل الصور.";

  $("authSubmit").textContent =
    isRegisterMode ? "إنشاء الحساب" : "دخول";

  $("toggleAuth").textContent =
    isRegisterMode ? "لديك حساب بالفعل؟ تسجيل الدخول" : "إنشاء حساب جديد";

  setAuthMessage("");
});

$("authForm").addEventListener("submit", async event => {
  event.preventDefault();

  const email = $("emailInput").value.trim();
  const password = $("passwordInput").value;
  const submit = $("authSubmit");

  submit.disabled = true;
  submit.textContent = "جارٍ التنفيذ...";

  try {
    if (isRegisterMode) {
      await createUserWithEmailAndPassword(auth, email, password);
      setAuthMessage("تم إنشاء الحساب بنجاح!", false);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      setAuthMessage("تم تسجيل الدخول بنجاح!", false);
    }

    setTimeout(closeAuth, 900);

  } catch (error) {
    const errors = {
      "auth/email-already-in-use": "هذا البريد مسجل بالفعل.",
      "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
      "auth/weak-password": "كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.",
      "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      "auth/user-not-found": "لا يوجد حساب بهذا البريد.",
      "auth/wrong-password": "كلمة المرور غير صحيحة.",
      "auth/too-many-requests": "محاولات كثيرة. حاول لاحقًا.",
      "auth/network-request-failed": "تحقق من اتصال الإنترنت."
    };

    setAuthMessage(errors[error.code] || "حدث خطأ: " + error.message);

  } finally {
    submit.disabled = false;
    $("authSubmit").textContent =
      isRegisterMode ? "إنشاء الحساب" : "دخول";
  }
});

// ==========================================
// 7. استعادة كلمة المرور
// ==========================================

$("forgotPassword").addEventListener("click", async () => {
  const email = $("emailInput").value.trim();

  if (!email) {
    setAuthMessage("اكتب بريدك الإلكتروني أولًا.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    setAuthMessage("تم إرسال رابط استعادة كلمة المرور إلى بريدك.", false);
  } catch (error) {
    setAuthMessage("تعذر إرسال الرابط. تأكد من البريد الإلكتروني.");
  }
});

// ==========================================
// 8. متابعة حالة الحساب
// ==========================================

onAuthStateChanged(auth, user => {
  currentUser = user;

  if (user) {
    $("accountLabel").textContent = user.email || "مستخدم";
    $("planLabel").textContent = "حساب مجاني";
    $("accountButton").textContent = "تسجيل الخروج";
    $("topLogin").textContent = "حسابي";
  } else {
    $("accountLabel").textContent = "زائر";
    $("planLabel").textContent = "حساب مجاني";
    $("accountButton").textContent = "تسجيل الدخول";
    $("topLogin").textContent = "حسابي";
  }
});

// ==========================================
// 9. اختيار الصور ومعاينتها
// ==========================================

$("attachButton").addEventListener("click", () => {
  imageInput.click();
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  if (!file) return;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    showToast("الصيغ المسموحة: JPG وPNG وWEBP");
    imageInput.value = "";
    return;
  }

  // حد أقصى 2.8 ميجابايت لتقليل مشكلات حجم الطلب
  if (file.size > 2.8 * 1024 * 1024) {
    showToast("حجم الصورة كبير. الحد الأقصى 2.8 ميجابايت.");
    imageInput.value = "";
    return;
  }

  selectedImage = file;

  previewImage.src = URL.createObjectURL(file);
  imagePreview.classList.remove("hidden");

  showToast("تم اختيار الصورة بنجاح");
});

function removeSelectedImage() {
  if (previewImage.src.startsWith("blob:")) {
    URL.revokeObjectURL(previewImage.src);
  }

  selectedImage = null;
  imageInput.value = "";
  previewImage.removeAttribute("src");
  imagePreview.classList.add("hidden");
}

$("removeImage").addEventListener("click", removeSelectedImage);

// ==========================================
// 10. تحويل الصورة إلى Base64
// ==========================================

function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(",")[1];

      if (!base64) {
        reject(new Error("تعذر قراءة الصورة."));
        return;
      }

      resolve(base64);
    };

    reader.onerror = () => reject(new Error("فشل تحميل الصورة."));
    reader.readAsDataURL(file);
  });
}

// ==========================================
// 11. عرض الرسائل
// ==========================================

function addMessage(text, sender) {
  const message = document.createElement("div");
  message.className = `message ${sender}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = sender === "user" ? "👤" : "TP";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;

  bubble.appendChild(content);
  message.appendChild(avatar);
  message.appendChild(bubble);

  messages.appendChild(message);
  welcome.classList.add("hidden");

  $("chatArea").scrollTop = $("chatArea").scrollHeight;

  return message;
}

function addLoadingMessage() {
  const message = addMessage("جاري التفكير...", "assistant");
  message.classList.add("loading-message");
  return message;
}

// ==========================================
// 12. إرسال الطلب إلى Gemini
// ==========================================

async function sendMessage() {
  if (isSending) return;

  const originalMessage = messageInput.value.trim();
  const image = selectedImage;

  if (!originalMessage && !image) {
    showToast("اكتب رسالة أو أرفق صورة أولًا.");
    return;
  }

  if (selectedTool === "Vision" && !image) {
    showToast("أرفق صورة أولًا لتحليلها.");
    imageInput.click();
    return;
  }

  if (image && !currentUser) {
    showToast("سجّل الدخول أولًا لاستخدام تحليل الصور.");
    openAuth();
    return;
  }

  let finalMessage =
    (toolPrompts[selectedTool] || "") + originalMessage;

  if (image && !originalMessage) {
    finalMessage = "حلل هذه الصورة واشرح محتواها.";
  }

  if (!finalMessage.trim()) {
    finalMessage = "ساعدني من فضلك.";
  }

  addMessage(
    originalMessage || "تحليل الصورة المرفقة",
    "user"
  );

  messageInput.value = "";
  messageInput.style.height = "auto";

  const loading = addLoadingMessage();

  isSending = true;
  sendButton.disabled = true;

  try {
    const payload = {
      message: finalMessage
    };

    if (image) {
      const idToken = await currentUser.getIdToken();

      payload.idToken = idToken;
      payload.image = {
        mimeType: image.type,
        data: await imageToBase64(image)
      };
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("الخادم لم يستجب بشكل صحيح. حاول مرة أخرى.");
    }

    const result = await response.json();

    loading.remove();

    if (!result.success) {
      if (result.code === "FREE_LIMIT_REACHED") {
        $("subscriptionModal").classList.remove("hidden");
        addMessage(
          "لقد استخدمت الصور المجانية الثلاث. يمكنك معرفة تفاصيل الاشتراك من نافذة Tell Professor Plus.",
          "assistant"
        );
        return;
      }

      throw new Error(result.error || "حدث خطأ أثناء تنفيذ الطلب.");
    }

    addMessage(
      result.reply || "لم تصل إجابة من الخادم.",
      "assistant"
    );

    if (image && typeof result.freeImagesRemaining === "number") {
      $("planLabel").textContent =
        `متبقي ${result.freeImagesRemaining} صور مجانية`;

      showToast(
        `تم التحليل بنجاح. المتبقي ${result.freeImagesRemaining} صور مجانية.`
      );
    }

    if (image) {
      removeSelectedImage();
    }

  } catch (error) {
    loading.remove();

    addMessage(
      "تعذر الاتصال بالخادم: " + error.message,
      "assistant"
    );

    console.error("Tell Professor AI error:", error);
  } finally {
    isSending = false;
    sendButton.disabled = false;
    messageInput.focus();
  }
}

// ==========================================
// 13. أزرار الإرسال
// ==========================================

sendButton.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";
  messageInput.style.height =
    Math.min(messageInput.scrollHeight, 150) + "px";
});

// ==========================================
// 14. الأسئلة السريعة
// ==========================================

document.querySelectorAll(".quick-prompts button").forEach(button => {
  button.addEventListener("click", () => {
    messageInput.value = button.dataset.prompt || "";
    messageInput.focus();
  });
});

// ==========================================
// 15. محادثة جديدة
// ==========================================

$("newChat").addEventListener("click", () => {
  messages.innerHTML = "";
  welcome.classList.remove("hidden");
  messageInput.value = "";
  removeSelectedImage();

  showToast("بدأت محادثة جديدة");
});

// ==========================================
// 16. الإملاء الصوتي
// ==========================================

$("micButton").addEventListener("click", () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    showToast("الإملاء الصوتي غير مدعوم في هذا المتصفح.");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "ar-EG";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    showToast("اتكلم الآن...");
  };

  recognition.onresult = event => {
    const spokenText = event.results[0][0].transcript;
    messageInput.value +=
      (messageInput.value ? " " : "") + spokenText;

    messageInput.focus();
  };

  recognition.onerror = event => {
    showToast("تعذر تشغيل الميكروفون: " + event.error);
  };

  recognition.start();
});

// ==========================================
// 17. نافذة الاشتراك
// ==========================================

function closeSubscription() {
  $("subscriptionModal").classList.add("hidden");
}

$("closeSubscription").addEventListener("click", closeSubscription);
$("closeSubscriptionButton").addEventListener("click", closeSubscription);

// ==========================================
// 18. القائمة الجانبية للموبايل
// ==========================================

$("menuButton").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

document.addEventListener("click", event => {
  const sidebar = $("sidebar");
  const menuButton = $("menuButton");

  if (
    window.innerWidth <= 800 &&
    sidebar.classList.contains("open") &&
    !sidebar.contains(event.target) &&
    !menuButton.contains(event.target)
  ) {
    sidebar.classList.remove("open");
  }
});

// ==========================================
// 19. رسالة البداية
// ==========================================

console.log("Tell Professor AI is ready.");
