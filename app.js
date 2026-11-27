
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDWXpZ2nxJpJ81sQCiiM6bO2SfkBp2zi5M",
  authDomain: "tell-professor-ai-ac46e.firebaseapp.com",
  projectId: "tell-professor-ai-ac46e",
  appId: "1:428530460091:web:8c84e71fec9dbd94a9909e"
};

const API_URL = "https://script.google.com/macros/s/AKfycbwmMbFGsPGHX2BvR_HN77rYLjxO1tEPUYxeYy3VxOZa6agsrZ7eowRF4Y6892iFKx5ftg/exec";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let currentUser = null;
let selectedImage = null;
let selectedTool = "Chat";

const $ = id => document.getElementById(id);

function showMessage(message) {
  const box = $("statusMessage");
  if (box) {
    box.textContent = message;
    box.hidden = false;
  } else {
    alert(message);
  }
}

async function api(data) {
async function api(data) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "حدث خطأ في الاتصال.");
  }

  return result;
}
async function getToken() {
  if (!currentUser) throw new Error("سجّل الدخول أولًا.");
  return await currentUser.getIdToken(true);
}

function showSubscription() {
  const modal = $("subscriptionModal");
  if (modal) modal.classList.remove("hidden");
  else createSubscriptionWindow();
}

function hideSubscription() {
  $("subscriptionModal")?.classList.add("hidden");
}

function createSubscriptionWindow() {
  const modal = document.createElement("div");
  modal.id = "subscriptionModal";
  modal.style.cssText = "position:fixed;inset:0;background:#000b;z-index:9999;display:grid;place-items:center;padding:18px";

  modal.innerHTML = `
    <div style="background:#11152b;color:white;padding:25px;border-radius:20px;width:min(420px,100%);text-align:center;font-family:Arial">
      <button id="closeNewSubscription" style="float:right;background:none;color:white;border:0;font-size:25px">×</button>
      <h2 style="color:#a78bfa">Professor Plus</h2>
      <h1>49 جنيهًا</h1>
      <p>اشتراك لمدة 30 يومًا</p>
      <p>لقد استهلكت الصور المجانية الثلاث.</p>
      <p>حوّل المبلغ إلى رقم فودافون كاش:</p>
      <h2 dir="ltr">01064240963</h2>
      <button id="copyVodafone" style="padding:12px;background:#7046d3;color:white;border:0;border-radius:10px">نسخ الرقم</button>
      <p style="margin-top:20px">بعد التحويل أدخل رقم العملية:</p>
      <input id="transactionRef" placeholder="رقم العملية" style="width:90%;padding:12px;border-radius:8px;border:0">
      <button id="sendSubscription" style="width:100%;padding:13px;margin-top:12px;background:#7046d3;color:white;border:0;border-radius:10px">إرسال طلب الاشتراك</button>
      <p id="subscriptionStatus"></p>
      <small>يتم التفعيل بعد مراجعة الأدمن والتأكد من الدفع.</small>
    </div>`;

  document.body.appendChild(modal);

  $("closeNewSubscription").onclick = () => modal.remove();

  $("copyVodafone").onclick = async () => {
    await navigator.clipboard.writeText("01064240963");
    showMessage("تم نسخ رقم فودافون كاش.");
  };

  $("sendSubscription").onclick = sendSubscriptionRequest;
}

async function sendSubscriptionRequest() {
  const reference = $("transactionRef")?.value.trim();
  const status = $("subscriptionStatus");

  if (!reference || reference.length < 4) {
    status.textContent = "اكتب رقم العملية بشكل صحيح.";
    return;
  }

  try {
    status.textContent = "جارٍ إرسال الطلب...";
    const result = await api({
      action: "createSubscriptionRequest",
      idToken: await getToken(),
      transactionRef: reference
    });

    status.textContent = result.message || "تم إرسال طلبك للمراجعة.";
  } catch (error) {
    status.textContent = error.message;
  }
}

async function refreshSubscriptionInfo() {
  if (!currentUser) return;

  try {
    const info = await api({
      action: "subscriptionInfo",
      idToken: await getToken()
    });

    if (info.isPlus) {
      showMessage("اشتراك Professor Plus نشط.");
    }
  } catch (error) {
    console.error(error);
  }
}

function setupTools() {
  document.querySelectorAll("[data-tool]").forEach(button => {
    button.addEventListener("click", () => {
      selectedTool = button.dataset.tool;
      document.querySelectorAll("[data-tool]").forEach(item => {
        item.classList.toggle("active", item === button);
      });
    });
  });
}

function setupImageUpload() {
  $("imageInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showMessage("اختر ملف صورة صالحًا.");
      return;
    }

    selectedImage = file;

    const preview = $("imagePreview");
    if (preview) {
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    }
  });
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.split(",")[1]);
    };

    reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));
    reader.readAsDataURL(file);
  });
}

async function sendMessage() {
  const input = $("messageInput");
  const message = input?.value.trim();

  if (!message && !selectedImage) {
    showMessage("اكتب رسالة أو اختر صورة.");
    return;
  }

  const sendButton = $("sendButton");
  if (sendButton) sendButton.disabled = true;

  try {
    let payload = { message: message || "حلل هذه الصورة." };

    if (selectedImage) {
      payload.idToken = await getToken();
      payload.image = {
        mimeType: selectedImage.type,
        data: await fileToBase64(selectedImage)
      };
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.code === "FREE_LIMIT_REACHED") {
      showSubscription();
      return;
    }

    if (!result.success) throw new Error(result.error || "تعذر تنفيذ الطلب.");

    const output = $("chatMessages");
    if (output) {
      const messageBox = document.createElement("div");
      messageBox.className = "assistant-message";
      messageBox.textContent = result.reply || "";
      output.appendChild(messageBox);
    }

    if (input) input.value = "";

    if (selectedImage) {
      selectedImage = null;
      if ($("imagePreview")) $("imagePreview").hidden = true;
      if ($("imageInput")) $("imageInput").value = "";
    }

    if (typeof result.freeImagesRemaining === "number") {
      showMessage("الصور المجانية المتبقية: " + result.freeImagesRemaining);
    }
  } catch (error) {
    showMessage(error.message);
  } finally {
    if (sendButton) sendButton.disabled = false;
  }
}

$("loginButton")?.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      $("emailInput").value.trim(),
      $("passwordInput").value
    );
  } catch (error) {
    showMessage(error.message);
  }
});

$("registerButton")?.addEventListener("click", async () => {
  try {
    await createUserWithEmailAndPassword(
      auth,
      $("emailInput").value.trim(),
      $("passwordInput").value
    );
  } catch (error) {
    showMessage(error.message);
  }
});

$("logoutButton")?.addEventListener("click", () => signOut(auth));
$("sendButton")?.addEventListener("click", sendMessage);
$("closeSubscription")?.addEventListener("click", hideSubscription);
$("closeSubscriptionButton")?.addEventListener("click", hideSubscription);
$("subscriptionButton")?.addEventListener("click", showSubscription);

$("messageInput")?.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

onAuthStateChanged(auth, async user => {
  currentUser = user;

  if ($("authSection")) $("authSection").hidden = !!user;
  if ($("appSection")) $("appSection").hidden = !user;

  if (user) await refreshSubscriptionInfo();
});

setupTools();
setupImageUpload();

const footer = document.querySelector("footer");
if (footer) {
  footer.textContent = "Powered by Professor المعتصم بالله المسلمي";
}
setupTools();
setupImageUpload();
