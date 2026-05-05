document.getElementById("people").addEventListener("blur", function() {
  formatInput(this);
});

// ==============================
// 状態管理（グローバル）
// ==============================
let editingIngredientId = null;

const IngredientStore = {
  KEY: "ingredients",

  getAll() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveAll(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  getById(id) {
    return this.getAll().find(i => i.id === id);
  },

  upsert(item) {
    const data = this.getAll();
    const index = data.findIndex(i => i.id === item.id);

    if (index !== -1) {
      data[index] = item;
    } else {
      data.push(item);
    }

    this.saveAll(data);
  },

  deleteById(id) {
    const data = this.getAll().filter(i => i.id !== id);
    this.saveAll(data);
  }
};

// ゴミ箱アイコンSVG
const TRASH_ICON_SVG = `
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    <path fill="currentColor" d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 7h2v9h-2v-9zm4 0h2v9h-2v-9zM6 8h12l-1 13H7L6 8z"/>
  </svg>
`;

// 登録アイコンSVG
const REGISTER_ICON_SVG = `
  <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
    <path fill="currentColor" d="M4 4h10v2H4V4zm0 4h10v2H4V8zm0 4h6v2H4v-2zm12-1v-3h2v3h3v2h-3v3h-2v-3h-3v-2h3z"/>
  </svg>
`;

// 編集アイコンSVG
const EDIT_ICON_SVG = `
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    <path fill="currentColor" d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42L18.37 3.29a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.83z"/>
  </svg>
`;

// 保存アイコンSVG
const SAVE_ICON_SVG = `
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    <path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14V7l-2-4zM5 5h11.17L17 6.83V19H5V5zm7 0v4H6V5h6z"/>
    <circle cx="12" cy="14" r="2" fill="currentColor"/>
  </svg>
`;

// キャンセルアイコンSVG
const CANCEL_ICON_SVG = `
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    <path fill="currentColor" d="M10 6L4 12l6 6v-4h4a4 4 0 0 0 0-8h-1v2h1a2 2 0 0 1 0 4h-4V6z"/>
  </svg>
`;

// 初期行
addRow();

// 食材一覧
migrateIngredients();
renderIngredientList();

// 食材id生成する
function generateIngredientId() {
  return `ing_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// idが無い場合にidを付与する
function migrateIngredients() {
  const data = IngredientStore.getAll();

  let changed = false;
  data.forEach(item => {
    if (!item.id) {
      item.id = generateIngredientId();
      changed = true;
    }
  });

  if (changed) {
    IngredientStore.saveAll(data);
  }
}

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
    <div class="row-line1">
      <div class="name-wrapper">
        <input type="text" class="name" placeholder="食材名（例：卵）" autocomplete="off">
        <ul class="suggestions hidden"></ul>
      </div>
      <div class="total-wrapper">
        <input type="text" class="total" inputmode="decimal" placeholder="内容量">
        <select class="unit">
          <option value="g">g</option>
          <option value="mL">mL</option>
          <option value="個">個</option>
        </select>
      </div>
      <input type="text" class="price" inputmode="decimal" placeholder="価格">
    </div>

    <div class="row-line2">
      <input type="text" class="used" inputmode="decimal" placeholder="使用量">
      <span class="unit-label">g</span>

      <div class="actions">
        <button class="btn-icon save-btn" aria-label="登録" title="登録">
          ${REGISTER_ICON_SVG}
        </button>
        <button class="btn-icon delete-btn" aria-label="削除" title="削除">
          ${TRASH_ICON_SVG}
        </button>
      </div>
    </div>
  `;

  setupNumberInputs(row);
  setupSaveButton(row);
  setupRowEvents(row);

  return row;
}

function setupNumberInputs(row) {
  // 単位プルダウン → 使用量の単位テキストに連動
  const unitSelect = row.querySelector(".unit");
  const unitLabel  = row.querySelector(".unit-label");
  unitSelect.addEventListener("change", () => {
    unitLabel.textContent = unitSelect.value;
  });

  row.querySelectorAll(".price, .total, .used")
    .forEach(input => {
      input.addEventListener("blur", () => formatInput(input));
    });
}

function setupSaveButton(row) {
  row.querySelector(".save-btn").addEventListener("click", () => {
    const nameEl = row.querySelector(".name");
    const priceEl = row.querySelector(".price");
    const totalEl = row.querySelector(".total");
    const unit = row.querySelector(".unit").value;

    const name = nameEl.value.trim();

    // 食材名チェック（空欄はNG）
    if (!name) {
      alert("食材名・価格・内容量を入力してください");
      nameEl.classList.add("error");
      nameEl.focus();
      return;
    } else {
      nameEl.classList.remove("error");
    }

    // 数値チェック（>0 & 空欄NG）※計算時と同じルールに統一
    const price = validatePositiveNumber(priceEl);
    const total = validatePositiveNumber(totalEl);

    if (price === null || total === null) {
      alert("食材名・価格・内容量を入力してください");
      (price === null ? priceEl : totalEl).focus();
      return;
    }

    // 同名食材が既にあればそのIDを使って上書き、なければ新規ID
    const existing = IngredientStore.getAll().find(i => i.name === name);
    const id = existing ? existing.id : generateIngredientId();

    IngredientStore.upsert({ id, name, price, total, unit });

    alert(existing ? `「${name}」を上書きしました` : "登録しました");
    renderIngredientList();
  });
}

function addRow() {
  const list = document.getElementById("ingredient-row");
  const newRow = createRow();

  list.appendChild(newRow);

  newRow.querySelector(".name").focus();
}

function calculate() {
  let hasError = false;
  let firstErrorEl = null;

  const peopleEl = document.getElementById("people");
  const people = validatePositiveNumber(peopleEl);

  if (people === null && !firstErrorEl) {
    hasError = true;
    firstErrorEl = peopleEl;
  }

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
    const panel = document.getElementById("result-panel");
    panel.classList.remove("hidden");
    
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
        <span class="value">${Number(item.cost.toFixed(0)).toLocaleString()} 円</span>
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
      <span class="value">${Number(totalCost.toFixed(0)).toLocaleString()} 円</span>
      <span class="ratio"></span>
    </div>
  `;

  // 一人前
  html += `
    <div class="result-row perPerson">
      <span class="name">一人前：</span>
      <span class="value">${Number((totalCost / people).toFixed(0)).toLocaleString()} 円</span>
      <span class="ratio"></span>
    </div>
  `;

  resultEl.innerHTML = html;
  document.getElementById("result-panel").classList.remove("hidden");
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

// 食材一覧表示
function renderIngredientList() {
  const listEl = document.getElementById("ingredient-list");
  listEl.innerHTML = "";

  IngredientStore.getAll().forEach(item => {
    listEl.appendChild(createIngredientRow(item));
  });
}

// 行追加表示
function createIngredientRow(item) {
  const div = document.createElement("div");
  div.className = "ingredient-item";
  div.dataset.id = item.id;

  div.innerHTML = `
    <div class="col-name">${item.name}</div>
    <div class="col-total">${Number(item.total).toLocaleString()} ${item.unit ?? ""}</div>
    <div class="col-price">${Number(item.price).toLocaleString()} 円</div>
    <div class="actions">
      <button class="btn-icon edit-btn" aria-label="編集" title="編集">
        ${EDIT_ICON_SVG}
      </button>
      <button class="btn-icon delete-btn" aria-label="削除" title="削除">
        ${TRASH_ICON_SVG}
      </button>
    </div>
  `;

  div.querySelector(".edit-btn")
    .addEventListener("click", () => editIngredient(item.id));

  div.querySelector(".delete-btn")
    .addEventListener("click", () => {
      IngredientStore.deleteById(item.id);
      renderIngredientList();
    });

  return div;
}

// 食材を編集
function editIngredient(id) {
  // すでに別の編集中なら、いったん一覧に戻す
  if (editingIngredientId && editingIngredientId !== id) {
    renderIngredientList();
  }

  const item = IngredientStore.getById(id);
  if (!item) return;

  const listEl = document.getElementById("ingredient-list");
  const targetRow = listEl.querySelector(`[data-id="${id}"]`);

  const editRow = createEditRow(item);
  editRow.dataset.id = id;

  targetRow.replaceWith(editRow);
  editingIngredientId = id;
}

function createEditRow(item) {
  const div = document.createElement("div");
  div.className = "ingredient-item";

  const unitVal = item.unit ?? "g";
  div.innerHTML = `
    <input class="col-name" value="${item.name}">
    <div class="col-total-wrapper">
      <input class="col-total" inputmode="decimal" value="${Number(item.total).toLocaleString()}">
      <select class="col-unit">
        <option value="g"  ${unitVal === "g"  ? "selected" : ""}>g</option>
        <option value="mL" ${unitVal === "mL" ? "selected" : ""}>mL</option>
        <option value="個" ${unitVal === "個" ? "selected" : ""}>個</option>
      </select>
    </div>
    <input class="col-price" inputmode="decimal" value="${Number(item.price).toLocaleString()}">
    <div class="actions">
      <button class="btn-icon save-btn" aria-label="保存" title="保存">
        ${SAVE_ICON_SVG}
      </button>
      <button class="btn-icon cancel-btn" aria-label="キャンセル" title="キャンセル">
        ${CANCEL_ICON_SVG}
      </button>
    </div>
  `;

  div.querySelector(".save-btn").addEventListener("click", () => saveEdit(item.id));

  div.querySelector(".cancel-btn").addEventListener("click", () => {
    editingIngredientId = null;
    renderIngredientList();
  });

  div.querySelectorAll("input").forEach(input => {
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") saveEdit(item.id);
      if (e.key === "Escape") renderIngredientList();
    });
  });

  div.querySelectorAll(".col-price, .col-total").forEach(input =>
    input.addEventListener("blur", () => formatInput(input))
  );

  return div;
}

// 食材編集を保存
function saveEdit(id) {
  const row = document.querySelector(`#ingredient-list [data-id="${id}"]`);
  if (!row) return;

  const name = row.querySelector(".col-name").value.trim() || "（名無しの食材）";
  const price = validatePositiveNumber(row.querySelector(".col-price"));
  const total = validatePositiveNumber(row.querySelector(".col-total"));

  if (price === null || total === null) return;

  const unit = row.querySelector(".col-unit").value;
  IngredientStore.upsert({ id, name, price, total, unit });
  
  // 編集中idをリセット
  editingIngredientId = null;
  
  renderIngredientList();
}

// ==============================
// オートコンプリート（食材名）
// ==============================
document.addEventListener("click", e => {
  document.querySelectorAll(".suggestions").forEach(list => {
    const wrapper = list.closest(".name-wrapper");

    if (!wrapper.contains(e.target)) {
      list.classList.add("hidden");
    }
  });
});

function setupAutocomplete(row) {
  const input = row.querySelector(".name");
  const list = row.querySelector(".suggestions");
  let selectedIndex = -1;
  let currentSuggestions = [];

  input.addEventListener("input", () => {
    currentSuggestions = getIngredientSuggestions(
      input.value.trim()
    );
    selectedIndex = -1;

    if (currentSuggestions.length === 0) {
      list.classList.add("hidden");
      return;
    }

    renderSuggestions(
      list,
      row,
      currentSuggestions,
      input,
      selectedIndex
    );
  });
  
  input.addEventListener("keydown", e => {
    if (list.classList.contains("hidden")) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex =
        (selectedIndex + 1) % currentSuggestions.length;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex =
        (selectedIndex - 1 + currentSuggestions.length) %
        currentSuggestions.length;
    }

    if (e.key === "Enter") {
      if (selectedIndex >= 0) {
        e.preventDefault();
        const item = currentSuggestions[selectedIndex];
        applySuggestion(row, input, item);
        list.classList.add("hidden");
        selectedIndex = -1;
        return;
      }
    }

    renderSuggestions(
      list,
      row,
      currentSuggestions,
      input,
      selectedIndex
    );
  });
}

function getIngredientSuggestions(inputValue) {
  const value = toKatakana(inputValue);
  if (!value) return [];

  const data = IngredientStore.getAll();

  return data.filter(i =>
    toKatakana(i.name).includes(value)
  );
}

// ひらがなをカタカナに変換
function toKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

function renderSuggestions(list, row, items, input, selectedIndex) {
  list.innerHTML = "";

  items.forEach((item, index) => {
    const li = document.createElement("li");
    li.textContent = item.name;

    if (index === selectedIndex) {
      li.classList.add("selected");
    }

    li.addEventListener("click", () => {
      applySuggestion(row, input, item);
      list.classList.add("hidden");
    });

    list.appendChild(li);
  });

  list.classList.remove("hidden");
}

function applySuggestion(row, input, item) {
  input.value = item.name;
  row.querySelector(".price").value =
    Number(item.price).toLocaleString();
  row.querySelector(".total").value =
    Number(item.total).toLocaleString();

  // 単位を復元して使用量ラベルも連動
  if (item.unit) {
    const unitSelect = row.querySelector(".unit");
    unitSelect.value = item.unit;
    row.querySelector(".unit-label").textContent = item.unit;
  }

  focusUsedInput(input);
}

// オートコンプリート確定後に使用量へフォーカスする
function focusUsedInput(currentInput) {
  const row = currentInput.closest('.row');
  if (!row) return;

  const usedInput = row.querySelector('.used');
  if (usedInput) {
    usedInput.focus();
    usedInput.select();
  }
}

// ==============================
// レシピストア
// ==============================
const RecipeStore = (() => {
  const KEY = "recipes";

  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }

  function saveAll(recipes) {
    localStorage.setItem(KEY, JSON.stringify(recipes));
  }

  function upsert(recipe) {
    const recipes = getAll();
    const idx = recipes.findIndex(r => r.id === recipe.id);
    if (idx >= 0) recipes[idx] = recipe;
    else recipes.push(recipe);
    saveAll(recipes);
  }

  function deleteById(id) {
    saveAll(getAll().filter(r => r.id !== id));
  }

  return { getAll, upsert, deleteById };
})();

// ==============================
// レシピ保存モーダル
// ==============================
function openRecipeModal() {
  const input = document.getElementById("recipe-name-input");
  input.value = "";
  document.getElementById("recipe-modal").classList.remove("hidden");
  input.focus();
}

function closeRecipeModal() {
  document.getElementById("recipe-modal").classList.add("hidden");
}

// Enterキーでも保存できるように
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("recipe-name-input")
    .addEventListener("keydown", e => {
      if (e.key === "Enter") confirmSaveRecipe();
      if (e.key === "Escape") closeRecipeModal();
    });
  renderRecipeList();
});

function confirmSaveRecipe() {
  const name = document.getElementById("recipe-name-input").value.trim();
  if (!name) {
    document.getElementById("recipe-name-input").classList.add("error");
    return;
  }

  const existing = RecipeStore.getAll().find(r => r.name === name);
  if (existing) {
    // 同名レシピあり → 上書き確認モーダルへ
    closeRecipeModal();
    openOverwriteModal(name, existing.id);
  } else {
    closeRecipeModal();
    saveRecipe(name, null);
  }
}

function openOverwriteModal(name, existingId) {
  document.getElementById("overwrite-recipe-name").textContent = name;
  document.getElementById("overwrite-modal").classList.remove("hidden");
  // ボタンにIDを持たせる
  document.getElementById("btn-overwrite").onclick  = () => { closeOverwriteModal(); saveRecipe(name, existingId); };
  document.getElementById("btn-new-save").onclick   = () => { closeOverwriteModal(); saveRecipe(name, null); };
  document.getElementById("btn-cancel-overwrite").onclick = () => closeOverwriteModal();
}

function closeOverwriteModal() {
  document.getElementById("overwrite-modal").classList.add("hidden");
}

// ==============================
// レシピ保存
// ==============================
function saveRecipe(recipeName, overwriteId = null) {
  // 人数を取得
  const peopleEl = document.getElementById("people");
  const people = parseFloat(normalizeNumber(peopleEl.value)) || 1;

  // 食材行を収集
  const rows = document.querySelectorAll("#ingredient-row .row");
  const items = [];

  rows.forEach(row => {
    const name  = row.querySelector(".name").value.trim();
    const total = parseFloat(normalizeNumber(row.querySelector(".total").value));
    const price = parseFloat(normalizeNumber(row.querySelector(".price").value));
    const unit  = row.querySelector(".unit").value;
    const used  = parseFloat(normalizeNumber(row.querySelector(".used").value));

    if (!name) return;

    // 食材を自動登録・更新
    const existing = IngredientStore.getAll().find(i => i.name === name);
    if (!existing) {
      // 未登録なら新規登録
      if (total > 0 && price > 0) {
        const id = generateIngredientId();
        IngredientStore.upsert({ id, name, price, total, unit });
      }
    } else if (
      (total > 0 && total !== existing.total) ||
      (price > 0 && price !== existing.price) ||
      unit !== existing.unit
    ) {
      // 登録済みで内容が変わっていれば更新
      IngredientStore.upsert({ ...existing, price: price || existing.price, total: total || existing.total, unit });
    }
    // 変更なしなら何もしない

    items.push({ name, used, unit });
  });

  const recipe = {
    id: overwriteId ?? "r_" + Date.now(),
    name: recipeName,
    people,
    items,
  };

  RecipeStore.upsert(recipe);
  renderIngredientList();
  renderRecipeList();
  alert(`「${recipeName}」を保存しました`);
}

// ==============================
// レシピ呼び出し
// ==============================
function loadRecipe(id) {
  const recipe = RecipeStore.getAll().find(r => r.id === id);
  if (!recipe) return;

  // 入力中の内容があれば確認
  const rows = document.querySelectorAll("#ingredient-row .row");
  const hasInput = Array.from(rows).some(row =>
    row.querySelector(".name").value.trim() !== ""
  );

  if (hasInput) {
    if (!confirm("現在の入力内容が消えますがよいですか？")) return;
  }

  // 人数をセット
  document.getElementById("people").value = recipe.people;

  // 食材行をクリアして再描画
  const list = document.getElementById("ingredient-row");
  list.innerHTML = "";

  recipe.items.forEach(item => {
    const row = createRow();
    list.appendChild(row);

    row.querySelector(".name").value = item.name;
    row.querySelector(".used").value = item.used;

    // 登録済み食材から価格・内容量を補完
    const unitSelect = row.querySelector(".unit");
    const stored = IngredientStore.getAll().find(i => i.name === item.name);
    if (stored) {
      row.querySelector(".price").value = Number(stored.price).toLocaleString();
      row.querySelector(".total").value = Number(stored.total).toLocaleString();
      unitSelect.value = stored.unit ?? item.unit ?? "g";
    } else {
      unitSelect.value = item.unit ?? "g";
    }
    row.querySelector(".unit-label").textContent = unitSelect.value;
  });

  // 計算して結果を表示
  calculate();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==============================
// レシピ削除
// ==============================
function deleteRecipe(id) {
  const recipe = RecipeStore.getAll().find(r => r.id === id);
  if (!recipe) return;
  if (!confirm(`「${recipe.name}」を削除しますか？`)) return;
  RecipeStore.deleteById(id);
  renderRecipeList();
}

// ==============================
// レシピ一覧描画
// ==============================
function renderRecipeList() {
  const list = document.getElementById("recipe-list");
  const recipes = RecipeStore.getAll();

  if (recipes.length === 0) {
    list.innerHTML = '<p class="empty-msg">保存されたレシピはありません</p>';
    return;
  }

  list.innerHTML = recipes.map(r => `
    <div class="recipe-item">
      <span class="recipe-name">${r.name}</span>
      <span class="recipe-meta">${r.people}人前・${r.items.length}品</span>
      <div class="actions">
        <button class="btn-secondary btn-sm" onclick="loadRecipe('${r.id}')">呼び出し</button>
        <button class="btn-icon delete-btn" onclick="deleteRecipe('${r.id}')" title="削除">
          ${TRASH_ICON_SVG}
        </button>
      </div>
    </div>
  `).join("");
}

// ==============================
// パネル折りたたみ
// ==============================
function togglePanel(bodyId, headerEl) {
  const body = document.getElementById(bodyId);
  const icon = headerEl.querySelector(".toggle-icon");
  const isHidden = body.classList.toggle("hidden");
  icon.textContent = isHidden ? "▼" : "▲";
}