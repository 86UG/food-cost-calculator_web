document.getElementById("people").addEventListener("blur", function() {
  formatInput(this);
});

// 初期行
addRow();

// 全角数字を半角に直す
function normalizeNumber(value) {
  value = value.replace(/[０-９]/g, s =>
    String.fromCharCode(s.charCodeAt(0) - 65248)
  );
  value = value.replace(/,/g, "");
  return value;
}

// 入力が0以下or空白ならnullを返す
function validatePositiveNumber(inputEl) {
  const raw = normalizeNumber(inputEl.value);
  const value = Number(raw);

  const isValid = raw !== "" && value > 0;
  inputEl.classList.toggle("error", !isValid);

  return isValid ? value : null;
}

function createRow() {
  const row = document.createElement("div");
  row.className = "row";

  row.innerHTML = `
    <button class="delete-btn">×</button>
    <div class="name-wrapper">
      <input class="name" placeholder="例：卵" autocomplete="off">
      <ul class="suggestions hidden"></ul>
    </div>
    <input class="price" inputmode="numeric" placeholder="298">
    <input class="total" inputmode="numeric" placeholder="10">
    <input class="used" inputmode="numeric" placeholder="1">
    <button class="save-btn">登録</button>
  `;

  setupNumberInputs(row);
  setupSaveButton(row);
  setupRowEvents(row);

  return row;
}

function setupNumberInputs(row) {
  row.querySelectorAll(".price, .total, .used")
    .forEach(input => {
      input.addEventListener("blur", () => formatInput(input));
    });
}

function setupSaveButton(row) {
  row.querySelector(".save-btn").addEventListener("click", () => {
    const name = row.querySelector(".name").value.trim();
    const price = normalizeNumber(row.querySelector(".price").value);
    const total = normalizeNumber(row.querySelector(".total").value);

    // 空白の場合に警告
    if (!name || !price || !total) {
      alert("食材名・価格・内容量を入力してください");
      return;
    }

    const ingredient = {
      name,
      price: Number(price),
      total: Number(total)
    };

    const saved = JSON.parse(localStorage.getItem("ingredients") || "[]");
    const index = saved.findIndex(i => i.name === name);

    if (index !== -1) saved[index] = ingredient;
    else saved.push(ingredient);

    localStorage.setItem("ingredients", JSON.stringify(saved));
    alert("登録しました");
  });
}

function addRow() {
  const list = document.getElementById("ingredient-row");
  const newRow = createRow();

  list.appendChild(newRow);
}

function calculate() {
  let hasError = false;
  let firstErrorEl = null;

  const peopleEl = document.getElementById("people");
  const people = validatePositiveNumber(peopleEl);

  if (people === null && !firstErrorEl) firstErrorEl = peopleEl;

  const rows = document.querySelectorAll("#ingredient-row .row");
  let totalCost = 0;
  let breakdown = [];

  rows.forEach(row => {   
    const priceEl = row.querySelector(".price");
    const totalEl = row.querySelector(".total");
    const usedEl  = row.querySelector(".used");

    const price = validatePositiveNumber(priceEl);
    const total = validatePositiveNumber(totalEl);
    const used  = validatePositiveNumber(usedEl);

    if (price === null || total === null || used === null) {
      hasError = true;

      if (!firstErrorEl) {
        firstErrorEl =
          price === null ? priceEl :
          total === null ? totalEl :
          usedEl;
      }

      return;
    }

    const name = (row.querySelector(".name").value || "（名無しの食材）") + "：";
    const cost = (price / total) * used;
    breakdown.push({ name, cost });
    totalCost += cost;
  });

  // エラー時
  if (hasError) {
    document.getElementById("result").innerText =
      "0より大きい数字を入力してください";

    if (firstErrorEl) firstErrorEl.focus();
    
    return;
  }

  // 正常時
  const resultEl = document.getElementById("result");
  let html = "";

  // 内訳
  breakdown.sort((a, b) => b.cost - a.cost); // 高い順にソート
  breakdown.forEach(item => {
    const ratio = (item.cost / totalCost) * 100;
    html += `
      <div class="result-row">
        <span class="name">${item.name}</span>
        <span class="value">${item.cost.toFixed(0)}円</span>
        <span class="ratio">（${ratio.toFixed(1)}%）</span>
      </div>
    `;
  });

  // 区切り
  html += "<hr>";

  // 合計
  html += `
    <div class="result-row">
      <span class="name">合計：</span>
      <span class="value">${totalCost.toFixed(0)}円</span>
      <span class="ratio"></span>
    </div>
  `;

  // 一人前
  html += `
    <div class="result-row perPerson">
      <span class="name">一人前：</span>
      <span class="value">${(totalCost / people).toFixed(0)}円</span>
      <span class="ratio"></span>
    </div>
  `;

  resultEl.innerHTML = html;
}

function formatInput(el) {
  const value = normalizeNumber(el.value);

  if (/^[0-9]+$/.test(value)) {
    el.value = Number(value).toLocaleString();
  }
}

function setupRowEvents(row) {
  setupAutocomplete(row);
  // 削除ボタン（共通）
  row.querySelector(".delete-btn").addEventListener("click", function() {
    const list = document.getElementById("ingredient-row");

    row.remove();

    // 行が0なら1行追加
    if (list.children.length === 0) {
      addRow();
    }
  });
}

function setupAutocomplete(row) {
  const input = row.querySelector(".name");
  const list = row.querySelector(".suggestions");

  input.addEventListener("input", () => {
    const value = input.value.trim();
    const data = JSON.parse(localStorage.getItem("ingredients") || "[]");

    list.innerHTML = "";

    if (!value) {
      list.classList.add("hidden");
      return;
    }

    data
      .filter(i => i.name.includes(value))
      .forEach(i => {
        const li = document.createElement("li");
        li.textContent = i.name;

        li.addEventListener("click", () => {
          input.value = i.name;
          row.querySelector(".price").value =
            Number(i.price).toLocaleString();
          row.querySelector(".total").value =
            Number(i.total).toLocaleString();
          list.classList.add("hidden");
        });

        list.appendChild(li);
      });

    list.classList.toggle("hidden", list.children.length === 0);
  });

  // フォーカス外れたら閉じる（少し遅延）
  document.addEventListener("click", e => {
    if (!row.contains(e.target)) {
      list.classList.add("hidden");
    }
  });
}