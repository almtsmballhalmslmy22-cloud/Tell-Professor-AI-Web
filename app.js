
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

const API_URL = "https://script.google.com/macros/s/AKfycbwmMbFGsPGHX2BvR_HN77rYLjxO1tEPUYxeYy3VxOZa6agsrZ7eowRF4Y6892iFKx5ftg/exec";

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

const $ = id => document.getElementById(id);

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
let subscriptionInfo = null;

// ==========================================
// 3. طلبات السيرفر
// ==========================================

async function apiRequest(data) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error("تعذر الاتصال بالسيرفر.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "حدث خطأ في الطلب.");
  }

  return result;
}

async function getToken() {
  if (!currentUser) {
    throw new Error("سجّل الدخول أولًا.");
  }

  return await currentUser.getIdToken();
}

// ==========================================
// 4. رسائل التنبيه
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
// 5. أدوات المحادثة
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
// 6. الحساب
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
// 7. تسجيل الدخول وإنشاء الحساب
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
    isRegisterMode
      ? "لديك حساب بالفعل؟ تسجيل الدخول"
      : "إنشاء حساب جديد";

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
// 8. استعادة كلمة المرور
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
// 9. تحديث معلومات الحساب والاشتراك
// ==========================================

async function refreshSubscriptionInfo() {
  if (!currentUser) return;

  try {
    const idToken = await getToken();

    subscriptionInfo = await apiRequest({
      action: "subscriptionInfo",
      idToken: idToken
    });

    const membership = subscriptionInfo.membership;

    if (membership && membership.active) {
      $("planLabel").textContent = "Professor Plus";
    } else {
      $("planLabel").textContent = "حساب مجاني";
    }

  } catch (error) {
    console.error("Subscription info:", error);
    $("planLabel").textContent = "حساب مجاني";
  }
}

onAuthStateChanged(auth, async user => {
  currentUser = user;
  subscriptionInfo = null;

  if (user) {
    $("accountLabel").textContent = user.email || "مستخدم";
    $("planLabel").textContent = "جارٍ تحميل الحساب...";
    $("accountButton").textContent = "تسجيل الخروج";
    $("topLogin").textContent = "حسابي";

    await refreshSubscriptionInfo();

  } else {
    $("accountLabel").textContent = "زائر";
    $("planLabel").textContent = "حساب مجاني";
    $("accountButton").textContent = "تسجيل الدخول";
    $("topLogin").textContent = "حسابي";
  }
});

// ==========================================
// 10. نافذة الاشتراك الجديدة
// ==========================================

function prepareSubscriptionModal() {
  const card = $("subscriptionModal").querySelector(".modal-card");

  card.innerHTML = `
    <button class="close-modal" id="closeSubscription">×</button>

    <div class="modal-logo">TP+</div>

    <h2>Tell Professor Plus</h2>

    <div class="subscription-price">
      49 جنيهًا <span>/ 30 يومًا</span>
    </div>

    <p>لقد استهلكت الصور المجانية الثلاث لهذا الحساب.</p>

    <div id="subscriptionDetails">
      <p>جارٍ تحميل بيانات الاشتراك...</p>
    </div>

    <div id="subscriptionFormArea"></div>

    <div id="subscriptionStatus"></div>

    <div id="adminArea"></div>

    <button id="closeSubscriptionButton" type="button">
      إغلاق
    </button>
  `;

  $("closeSubscription").addEventListener("click", closeSubscription);
  $("closeSubscriptionButton").addEventListener("click", closeSubscription);
}

function closeSubscription() {
  $("subscriptionModal").classList.add("hidden");
}

prepareSubscriptionModal();

// ==========================================
// 11. فتح نافذة الاشتراك وتحميل البيانات
// ==========================================

async function openSubscription() {
  if (!currentUser) {
    showToast("سجّل الدخول أولًا.");
    openAuth();
    return;
  }

  $("subscriptionModal").classList.remove("hidden");

  $("subscriptionDetails").textContent = "جارٍ تحميل بيانات الاشتراك...";
  $("subscriptionFormArea").innerHTML = "";
  $("subscriptionStatus").innerHTML = "";
  $("adminArea").innerHTML = "";

  try {
    const idToken = await getToken();

    const info = await apiRequest({
      action: "subscriptionInfo",
      idToken: idToken
    });

    subscriptionInfo = info;

    $("subscriptionDetails").innerHTML = `
      <div class="subscription-note">
        <p><strong>طريقة الدفع:</strong> ${info.paymentMethod}</p>
        <p><strong>رقم التحويل:</strong></p>
        <p id="vodafoneNumber" dir="ltr"></p>
        <p>حوّل 49 جنيهًا، ثم أدخل رقم العملية لإرسال طلب المراجعة.</p>
      </div>
    `;

    $("vodafoneNumber").textContent = info.paymentNumber;

    if (info.membership && info.membership.active) {
      $("subscriptionStatus").textContent =
        "اشتراكك نشط حتى: " +
        new Date(info.membership.expiresAt).toLocaleDateString("ar-EG");

      $("subscriptionFormArea").innerHTML = "";
    } else {
      showSubscriptionForm();
    }

    await loadMySubscriptionRequests();
    await checkAdminAccess();

  } catch (error) {
    $("subscriptionDetails").textContent = error.message;
  }
}

// ==========================================
// 12. نموذج إرسال طلب الاشتراك
// ==========================================

function showSubscriptionForm() {
  $("subscriptionFormArea").innerHTML = `
    <form id="subscriptionRequestForm">
      <label for="transactionRef">رقم عملية التحويل</label>

      <input
        id="transactionRef"
        type="text"
        maxlength="100"
        minlength="4"
        required
        placeholder="اكتب رقم العملية"
        style="width:100%;margin:10px 0;padding:12px;border-radius:10px;"
      >

      <button id="subscriptionSubmit" type="submit">
        إرسال طلب الاشتراك
      </button>
    </form>
  `;

  $("subscriptionRequestForm").addEventListener("submit", submitSubscriptionRequest);
}

async function submitSubscriptionRequest(event) {
  event.preventDefault();

  const transactionRef = $("transactionRef").value.trim();
  const button = $("subscriptionSubmit");

  if (transactionRef.length < 4) {
    showToast("اكتب رقم عملية صحيحًا.");
    return;
  }

  button.disabled = true;
  button.textContent = "جارٍ إرسال الطلب...";

  try {
    const idToken = await getToken();

    const result = await apiRequest({
      action: "createSubscriptionRequest",
      idToken: idToken,
      transactionRef: transactionRef
    });

    $("subscriptionStatus").textContent =
      "تم إرسال طلبك بنجاح. الطلب الآن قيد المراجعة.";

    $("subscriptionFormArea").innerHTML = "";

    showToast(result.message || "تم إرسال الطلب.");

    await loadMySubscriptionRequests();

  } catch (error) {
    showToast(error.message);
    button.disabled = false;
    button.textContent = "إرسال طلب الاشتراك";
  }
}

// ==========================================
// 13. عرض طلبات المستخدم
// ==========================================

async function loadMySubscriptionRequests() {
  if (!currentUser) return;

  try {
    const idToken = await getToken();

    const result = await apiRequest({
      action: "mySubscriptionRequests",
      idToken: idToken
    });

    const area = $("subscriptionStatus");

    if (!result.requests || result.requests.length === 0) {
      return;
    }

    const labels = {
      pending: "قيد المراجعة",
      approved: "تمت الموافقة",
      rejected: "مرفوض"
    };

    const list = document.createElement("div");

    const heading = document.createElement("h3");
    heading.textContent = "طلبات الاشتراك";
    list.appendChild(heading);

    result.requests.forEach(request => {
      const item = document.createElement("p");

      item.textContent =
        "رقم العملية: " + request.transactionRef +
        " — الحالة: " + (labels[request.status] || request.status);

      list.appendChild(item);
    });

    area.appendChild(list);

    if (result.membership && result.membership.active) {
      $("planLabel").textContent = "Professor Plus";
      $("subscriptionFormArea").innerHTML = "";
    }

  } catch (error) {
    console.error("My subscription requests:", error);
  }
}

// ==========================================
// 14. لوحة الإدارة
// ==========================================

async function checkAdminAccess() {
  if (!currentUser) return;

  try {
    const idToken = await getToken();

    const result = await apiRequest({
      action: "adminListRequests",
      idToken: idToken
    });

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "فتح لوحة إدارة الاشتراكات";

    button.addEventListener("click", () => {
      renderAdminRequests(result.requests || []);
    });

    $("adminArea").appendChild(button);

  } catch (error) {
    // المستخدم العادي لا يملك صلاحية الإدارة.
  }
}

function renderAdminRequests(requests) {
  const area = $("adminArea");
  area.innerHTML = "";

  const heading = document.createElement("h3");
  heading.textContent = "لوحة إدارة الاشتراكات";
  area.appendChild(heading);

  if (!requests.length) {
    const empty = document.createElement("p");
    empty.textContent = "لا توجد طلبات اشتراك.";
    area.appendChild(empty);
    return;
  }

  requests.forEach(request => {
    const card = document.createElement("div");
    card.style.padding = "12px";
    card.style.margin = "10px 0";
    card.style.border = "1px solid #555";
    card.style.borderRadius = "10px";

    const info = document.createElement("p");
    info.textContent =
      "البريد: " + request.email +
      " | رقم العملية: " + request.transactionRef +
      " | المبلغ: " + request.amount +
      " | الحالة: " + request.status;

    card.appendChild(info);

    if (request.status === "pending") {
      const approve = document.createElement("button");
      approve.textContent = "موافقة وتفعيل الاشتراك";

      approve.addEventListener("click", () => {
        reviewSubscription(request.id, "adminApproveRequest");
      });

      const reject = document.createElement("button");
      reject.textContent = "رفض الطلب";

      reject.addEventListener("click", () => {
        reviewSubscription(request.id, "adminRejectRequest");
      });

      card.appendChild(approve);
      card.appendChild(reject);
    }

    area.appendChild(card);
  });
}

async function reviewSubscription(requestId, action) {
  try {
    const idToken = await getToken();

    const result = await apiRequest({
      action: action,
      idToken: idToken,
      requestId: requestId
    });

    showToast(result.message || "تم تنفيذ الطلب.");

    const refreshed = await apiRequest({
      action: "adminListRequests",
      idToken: idToken
    });

    renderAdminRequests(refreshed.requests || []);

    await refreshSubscriptionInfo();

  } catch (error) {
    showToast(error.message);
  }
}

// ==========================================
// 15. اختيار الصور ومعاينتها
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
// 16. تحويل الصورة إلى Base64
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
// 17. عرض الرسائل
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
// 18. إرسال الطلب إلى Gemini
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
      const idToken = await getToken();

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
        addMessage(
          "لقد استخدمت الصور المجانية الثلاث. افتح نافذة الاشتراك لمعرفة التفاصيل.",
          "assistant"
        );

        await openSubscription();
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

    if (image && result.subscriptionActive) {
      $("planLabel").textContent = "Professor Plus";
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
// 19. أزرار الإرسال
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
// 20. الأسئلة السريعة
// ==========================================

document.querySelectorAll(".quick-prompts button").forEach(button => {
  button.addEventListener("click", () => {
    messageInput.value = button.dataset.prompt || "";
    messageInput.focus();
  });
});

// ==========================================
// 21. محادثة جديدة
// ==========================================

$("newChat").addEventListener("click", () => {
  messages.innerHTML = "";
  welcome.classList.remove("hidden");
  messageInput.value = "";
  removeSelectedImage();

  showToast("بدأت محادثة جديدة");
});

// ==========================================
// 22. الإملاء الصوتي
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
// 23. أزرار الاشتراك
// ==========================================

$("closeSubscriptionButton").addEventListener("click", closeSubscription);

// فتح نافذة الاشتراك عند الضغط على زر الحساب إذا كان هناك اشتراك مطلوب
// يمكن استدعاء openSubscription من أي زر آخر في الموقع.

// ==========================================
// 24. القائمة الجانبية للموبايل
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
// 25. رسالة البداية
// ==========================================

console.log("Tell Professor AI is ready.");
