// 1) Вставьте сюда значения из Supabase -> Project Settings -> API
const SUPABASE_URL = "PASTE_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_SUPABASE_ANON_KEY_HERE";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const splash = document.getElementById("splash");
const app = document.getElementById("app");
const enterBtn = document.getElementById("enterBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginBox = document.getElementById("loginBox");
const heartBox = document.getElementById("heartBox");
const heartBtn = document.getElementById("heartBtn");
const cooldownText = document.getElementById("cooldownText");
const statusText = document.getElementById("statusText");
const emailInput = document.getElementById("emailInput");
const loginBtn = document.getElementById("loginBtn");
const himCount = document.getElementById("himCount");
const herCount = document.getElementById("herCount");
const lastMessage = document.getElementById("lastMessage");
const toast = document.getElementById("toast");

const flightLayer = document.getElementById("flightLayer");

function flyHeart(direction){
  // Coordinates are percentages within the hero image.
  // Him: Hangzhou -> Moscow. Her: Moscow -> Hangzhou.
  const routes = {
    hangzhouToMoscow: {
      sx:"79%", sy:"59%", mx:"57%", my:"28%", ex:"31%", ey:"40%"
    },
    moscowToHangzhou: {
      sx:"31%", sy:"40%", mx:"57%", my:"28%", ex:"79%", ey:"59%"
    }
  };

  const r = routes[direction];
  if(!r || !flightLayer) return;

  // Main heart
  const heart = document.createElement("div");
  heart.className = "flying-heart";
  heart.textContent = "❤️";
  for(const [k,v] of Object.entries(r)) heart.style.setProperty(`--${k}`, v);
  flightLayer.appendChild(heart);

  // Small trail hearts
  [0.12,0.32,0.52].forEach((delay, i)=>{
    const t = document.createElement("div");
    t.className = "trail-heart";
    t.textContent = i === 1 ? "❤" : "♡";
    for(const [k,v] of Object.entries(r)) t.style.setProperty(`--${k}`, v);
    t.style.setProperty("--delay", `${delay}s`);
    flightLayer.appendChild(t);
    setTimeout(()=>t.remove(), 2600);
  });

  setTimeout(()=>heart.remove(), 2600);
}


let myRole = null;
let nextAllowedAt = null;
let timerId = null;

function showToast(text){
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), 2200);
}

enterBtn.addEventListener("click", ()=>{
  splash.classList.add("hidden");
  app.classList.remove("hidden");
});

loginBtn.addEventListener("click", async ()=>{
  const email = emailInput.value.trim();
  if(!email) return showToast("Введите e-mail");
  const redirectTo = location.origin + location.pathname;
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo }
  });
  if(error) return showToast(error.message);
  showToast("Ссылка для входа отправлена ❤️");
});

logoutBtn.addEventListener("click", async ()=>{
  await sb.auth.signOut();
  myRole = null;
  heartBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
  statusText.textContent = "Войдите по ссылке из письма";
});

heartBtn.addEventListener("click", async ()=>{
  if(!myRole) return;
  heartBtn.disabled = true;

  const { data, error } = await sb.rpc("send_heart");
  if(error){
    heartBtn.disabled = false;
    return showToast(error.message);
  }

  if(!data?.ok){
    nextAllowedAt = data?.next_allowed_at ? new Date(data.next_allowed_at) : null;
    updateCooldown();
    return showToast("Еще рано ❤️");
  }

  nextAllowedAt = data.next_allowed_at ? new Date(data.next_allowed_at) : null;

  const direction = myRole === "him" ? "hangzhouToMoscow" : "moscowToHangzhou";
  flyHeart(direction);

  showToast(
    myRole === "him"
      ? "Сердечко летит из Ханчжоу в Москву ❤️"
      : "Сердечко летит из Москвы в Ханчжоу ❤️"
  );
  await refreshState();
});

async function refreshState(){
  const { data, error } = await sb.rpc("get_heart_state");
  if(error) return console.error(error);

  if(data){
    himCount.textContent = data.him_count ?? 0;
    herCount.textContent = data.her_count ?? 0;

    if(data.last_sender){
      const who = data.last_sender === "him" ? "Он" : "Она";
      const when = data.last_sent_at ? new Date(data.last_sent_at).toLocaleString("ru-RU") : "";
      lastMessage.textContent = `${who} отправил(а) сердечко ❤️ ${when}`;
    } else {
      lastMessage.textContent = "Пока тихо…";
    }

    nextAllowedAt = data.my_next_allowed_at ? new Date(data.my_next_allowed_at) : null;
    updateCooldown();
  }
}

function updateCooldown(){
  if(timerId) clearTimeout(timerId);

  if(!nextAllowedAt){
    heartBtn.disabled = false;
    cooldownText.textContent = "Можно отправить сейчас";
    return;
  }

  const ms = nextAllowedAt - new Date();
  if(ms <= 0){
    heartBtn.disabled = false;
    cooldownText.textContent = "Можно отправить сейчас";
    return;
  }

  heartBtn.disabled = true;
  const totalSec = Math.ceil(ms/1000);
  const m = Math.floor(totalSec/60);
  const s = totalSec%60;
  cooldownText.textContent = `Следующее сердечко через ${m}:${String(s).padStart(2,"0")}`;
  timerId = setTimeout(updateCooldown, 1000);
}

async function loadMe(){
  const { data: { session } } = await sb.auth.getSession();
  if(!session){
    loginBox.classList.remove("hidden");
    heartBox.classList.add("hidden");
    statusText.textContent = "Войдите по ссылке из письма";
    return;
  }

  const { data, error } = await sb.rpc("get_my_role");
  if(error || !data){
    statusText.textContent = "Этот e-mail не добавлен в список пары";
    loginBox.classList.add("hidden");
    heartBox.classList.add("hidden");
    return;
  }

  myRole = data;
  loginBox.classList.add("hidden");
  heartBox.classList.remove("hidden");
  statusText.textContent = myRole === "him"
    ? "Для Него: отправь сердечко Ей ❤️"
    : "Для Нее: отправь сердечко Ему ❤️";

  await refreshState();
}

sb.auth.onAuthStateChange(()=>loadMe());
loadMe();
setInterval(refreshState, 15000);
