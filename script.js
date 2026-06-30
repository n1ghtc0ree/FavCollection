const OMDB_KEY = "trilogy";

const storedMovies = localStorage.getItem("cineflow_media");
const movies = storedMovies ? JSON.parse(storedMovies) : [];

let currentFilter = "All";

function saveToStorage() {
  localStorage.setItem("cineflow_media", JSON.stringify(movies));
}

async function fetchOmdbData(title) {
  try {
    const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&plot=short&apikey=${OMDB_KEY}`);
    const data = await res.json();
    if (data.Response === "True") {
      return {
        poster: data.Poster && data.Poster !== "N/A" ? data.Poster : null,
        plot: data.Plot && data.Plot !== "N/A" ? data.Plot : null,
        genre: data.Genre && data.Genre !== "N/A" ? data.Genre : null
      };
    }
    return null;
  } catch (err) {
    logError("OMDB API fetch failed: " + err.message);
    return null;
  }
}

function matchCategory(omdbGenreString) {
  if (!omdbGenreString) return "Sci-Fi";
  const genres = omdbGenreString.split(",").map(g => g.trim().toLowerCase());
  
  const mapping = {
    "Fantasy": ["fantasy"],
    "Animation": ["animation", "animated"],
    "Romance": ["romance"],
    "Adventure": ["adventure"],
    "Sci-Fi": ["sci-fi", "science fiction"],
    "Horror": ["horror"],
    "Thriller": ["thriller", "mystery"],
    "Drama": ["drama"],
    "Action": ["action"],
    "Comedy": ["comedy"]
  };

  for (const [catKey, keywords] of Object.entries(mapping)) {
    for (const keyword of keywords) {
      if (genres.includes(keyword)) {
        return catKey;
      }
    }
  }
  return "Sci-Fi";
}

const moviesList = document.getElementById("booksList");
const modal = document.getElementById("bookModal");
const viewModal = document.getElementById("viewModal");
const closeModalBtn = document.getElementById("closeModal");
const closeViewModalBtn = document.getElementById("closeViewModal");
const form = document.getElementById("bookForm");
const quickAddForm = document.getElementById("quickAddForm");
const quickAddInput = document.getElementById("quickAddInput");
const filterBar = document.getElementById("filterBar");
let editIndex = null;

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createMovieCard({ name, img, desc, category }, index) {
  const delay = Math.min(0.1 + (index * 0.05), 0.6);
  const safeName = escapeHtml(name);
  const safeDesc = escapeHtml(desc);
  return `
    <div class="books-card animate-entry" style="animation-delay: ${delay}s;" data-index="${index}" id="movieCard-${index}">
      <div class="books-body">
        <div class="image-container loading" id="imgContainer-${index}">
          <span class="card-category-badge">${escapeHtml(category)}</span>
          <img src="" class="books-image" id="img-${index}" alt="${safeName}" />
        </div>
        <div class="books-title">${safeName}</div>
        <div class="books-text">${safeDesc}</div>
      </div>
      <div class="books-actions">
        <button class="icon-btn edit" title="Edit" onclick="event.stopPropagation(); editMovie(${index})">
          <i class="fa-regular fa-pen-to-square"></i>
        </button>
        <button class="icon-btn delete" title="Delete" onclick="event.stopPropagation(); deleteMovie(${index})">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    </div>`;
}

async function loadImageForCard(movie, index) {
  const imgEl = document.getElementById(`img-${index}`);
  const containerEl = document.getElementById(`imgContainer-${index}`);
  if (!imgEl || !containerEl) return;

  let finalSrc = movie.img;

  if (!finalSrc) {
    const omdbData = await fetchOmdbData(movie.name);
    if (omdbData && omdbData.poster) {
      finalSrc = omdbData.poster;
      movie.img = finalSrc;
      saveToStorage();
    } else {
      logWarn(`No poster found for title: "${movie.name}"`);
    }
  }

  if (finalSrc) {
    imgEl.src = finalSrc;
    imgEl.onload = () => {
      containerEl.classList.remove("loading");
      imgEl.classList.add("loaded");
    };
    imgEl.onerror = () => {
      logError(`Failed to load image resource: ${finalSrc}`);
      showNotFoundPlaceholder(containerEl);
    };
  } else {
    showNotFoundPlaceholder(containerEl);
  }
}

function showNotFoundPlaceholder(container) {
  container.classList.remove("loading");
  const badge = container.querySelector(".card-category-badge")?.outerHTML || "";
  container.innerHTML = `
    ${badge}
    <div class="not-found-thumb">
      <i class="fa-solid fa-film"></i>
      <span>Cover<br>Not Found</span>
    </div>`;
}

function renderFilters() {
    if (!filterBar) return;
    
    const categories = ["All", ...new Set(movies.map(m => m.category))];
    const currentButtons = Array.from(filterBar.querySelectorAll(".filter-btn"));
    const currentCats = currentButtons.map(b => b.getAttribute("data-cat"));

    if (currentCats.length !== categories.length || !categories.every((c, i) => currentCats[i] === c)) {
        filterBar.innerHTML = categories.map(cat => `
            <button class="filter-btn ${currentFilter === cat ? 'active' : ''}" data-cat="${escapeHtml(cat)}" onclick="setFilter('${escapeHtml(cat)}')">${escapeHtml(cat)}</button>
        `).join('');
    } else {
        currentButtons.forEach(btn => {
            const cat = btn.getAttribute("data-cat");
            if (cat === currentFilter) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }
    
    if (window.matchMedia("(max-width: 768px)").matches) {
        if (filterBar.scrollWidth > filterBar.clientWidth) {
            filterBar.style.justifyContent = "flex-start";
        } else {
            filterBar.style.justifyContent = "center";
        }
    }
}

function setFilter(filter) {
    currentFilter = filter;
    logLog(`Filter switched to: "${filter}"`);
    render();
}

function render() {
    if (!moviesList) return;
    moviesList.innerHTML = "";
    
    const filtered = currentFilter === "All" ? movies : movies.filter(m => m.category === currentFilter);
    
    if (filtered.length === 0) {
        moviesList.innerHTML = `
          <div class="empty">
            <h3>No movies found :(</h3>
            <p>but it's never too late to change it!</p>
          </div>`;
    } else {
        filtered.forEach((movie, index) => {
            const realIndex = movies.indexOf(movie);
            moviesList.innerHTML += createMovieCard(movie, realIndex);
        });
        filtered.forEach((movie, index) => {
            const realIndex = movies.indexOf(movie);
            loadImageForCard(movie, realIndex);
        });
        initTiltEffect();
        initMobileCardInteractions();
    }
    renderFilters();
}

function initTiltEffect() {
  if (window.matchMedia("(max-width: 768px)").matches) return;
  const cards = document.querySelectorAll(".books-card");
  
  cards.forEach(card => {
    let reqId = null;
    let targetX = 0; targetY = 0; targetScale = 1;
    let currentX = 0; currentY = 0; currentScale = 1;
    let isHovered = false;
    let lastLeft = card.offsetLeft; let lastTop = card.offsetTop;
    let internalX = 0; let internalY = 0;

    if (reqId) cancelAnimationFrame(reqId);

    function updateAnimation() {
      const currentLeft = card.offsetLeft;
      const currentTop = card.offsetTop;
      if (currentLeft !== lastLeft || currentTop !== lastTop) {
        internalX += lastLeft - currentLeft;
        internalY += lastTop - currentTop;
        lastLeft = currentLeft; lastTop = currentTop;
      }
      internalX += (0 - internalX) * 0.1;
      internalY += (0 - internalY) * 0.1;

      if (!isHovered) {
        currentX += (0 - currentX) * 0.08;
        currentY += (0 - currentY) * 0.08;
        currentScale += (1 - currentScale) * 0.08;
        card.style.transform = `scale(${currentScale}) translate(${currentX + internalX}px, ${currentY + internalY}px)`;
        if (Math.abs(currentX + internalX) < 0.01 && Math.abs(currentY + internalY) < 0.01 && Math.abs(currentScale - 1) < 0.001) {
          card.style.transform = "scale(1) translate(0px, 0px)";
          reqId = requestAnimationFrame(updateAnimation);
          return;
        }
      } else {
        currentX += (targetX - currentX) * 0.1;
        currentY += (targetY - currentY) * 0.1;
        currentScale += (targetScale - currentScale) * 0.1;
        card.style.transform = `scale(${currentScale}) translate(${currentX + internalX}px, ${currentY + internalY}px)`;
      }
      reqId = requestAnimationFrame(updateAnimation);
    }
    reqId = requestAnimationFrame(updateAnimation);
    
    card.addEventListener("mousemove", e => {
      const rect = card.getBoundingClientRect();
      targetX = ((e.clientX - rect.left - (rect.width / 2)) / (rect.width / 2)) * 3;
      targetY = ((e.clientY - rect.top - (rect.height / 2)) / (rect.height / 2)) * 3;
    });
    card.addEventListener("mouseenter", () => { isHovered = true; targetScale = 1.04; });
    card.addEventListener("mouseleave", () => { isHovered = false; targetX = 0; targetY = 0; targetScale = 1; });
    card.addEventListener("click", () => { openViewModal(card.getAttribute("data-index")); });
  });
}

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE = 8;

function openViewModal(index) {
  const movie = movies[index];
  if (!movie) {
    logError(`Cannot open read-only view modal. Index [${index}] out of bounds.`);
    return;
  }
  logLog(`Opening view modal for index: [${index}] -> "${movie.name}"`);
  
  const modalImage = document.getElementById("viewModalImage");
  const modalCategory = document.getElementById("viewModalCategory");
  const modalTitle = document.getElementById("viewModalTitle");
  const modalDesc = document.getElementById("viewModalDesc");
  
  if (movie.img) {
    modalImage.innerHTML = `<img src="${escapeHtml(movie.img)}" alt="${escapeHtml(movie.name)}">`;
  } else {
    modalImage.innerHTML = `
      <div class="not-found-thumb" style="position: relative; height: 100%;">
        <i class="fa-solid fa-film"></i>
        <span>Cover<br>Not Found</span>
      </div>`;
  }
  modalCategory.textContent = movie.category;
  modalTitle.textContent = movie.name;
  modalDesc.textContent = movie.desc || "No description provided.";
  viewModal.classList.add("open");
}

function initMobileCardInteractions() {
  if (!window.matchMedia("(max-width: 768px)").matches) return;
  document.querySelectorAll(".books-card").forEach(card => {
    const index = card.getAttribute("data-index");
    let pressTimer = null;
    let longPressFired = false;
    let isScrolling = false;
    let startX = 0, startY = 0;

    card.addEventListener("touchstart", (e) => {
      longPressFired = false;
      isScrolling = false;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      
      pressTimer = setTimeout(() => {
        if (!isScrolling) {
          longPressFired = true;
          editMovie(Number(index));
          if (navigator.vibrate) navigator.vibrate(15);
        }
      }, LONG_PRESS_MS);
    }, { passive: true });

    card.addEventListener("touchmove", (e) => {
      const touch = e.touches[0];
      if (Math.abs(touch.clientX - startX) > LONG_PRESS_MOVE_TOLERANCE || Math.abs(touch.clientY - startY) > LONG_PRESS_MOVE_TOLERANCE) {
        isScrolling = true;
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      }
    }, { passive: true });

    card.addEventListener("touchend", (e) => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      if (!longPressFired && !isScrolling) {
          const currentTarget = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
          if (currentTarget && currentTarget.closest(`.books-card`) === card) {
              openViewModal(index);
          }
      }
    });

    card.addEventListener("touchcancel", () => { 
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } 
    });
  });
}

function editMovie(index) {
  editIndex = index;
  const movie = movies[index];
  if (!movie) return;
  logLog(`Opening edit modal for index: [${index}]`);
  
  document.getElementById("modalTitle").innerText = "Edit Movie";
  document.getElementById("bookTitle").value = movie.name;
  document.getElementById("bookImg").value = movie.img || "";
  document.getElementById("bookCategory").value = movie.category;
  document.getElementById("bookDesc").value = movie.desc || "";
  
  const delBtn = document.getElementById("modalDeleteBtn");
  if (delBtn) delBtn.style.display = "flex";
  modal.classList.add("open");
}

function deleteMovie(index) {
  const card = document.getElementById(`movieCard-${index}`);
  logWarn(`Deleting movie asset at index: [${index}]`);
  if (card) {
      card.classList.add("card-fade-out");
      setTimeout(() => {
          movies.splice(index, 1);
          saveToStorage();
          render();
      }, 400);
  } else {
      movies.splice(index, 1);
      saveToStorage();
      render();
  }
}

if (form) {
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = document.getElementById("bookTitle").value.trim();
        const img = document.getElementById("bookImg").value.trim();
        const category = document.getElementById("bookCategory").value;
        const desc = document.getElementById("bookDesc").value.trim();

        if (!title) return;
        if (editIndex !== null) {
            movies[editIndex] = { name: title, img, category, desc };
            logLog(`Successfully updated movie item at index: [${editIndex}]`);
        }
        saveToStorage();
        render();
        modal.classList.remove("open");
    });
}

if (quickAddForm) {
    quickAddForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = quickAddInput.value.trim();
        if (!title) return;

        logLog(`Quick adding media entry by title request: "${title}"`);
        const inputEl = quickAddInput;
        const btnEl = quickAddForm.querySelector("button");
        inputEl.disabled = true; btnEl.disabled = true;
        
        if (document.activeElement) {
            document.activeElement.blur();
        }

        const data = await fetchOmdbData(title);
        let newImg = ""; let newDesc = ""; let newCategory = "Sci-Fi";

        if (data) {
            newImg = data.poster || "";
            newDesc = data.plot || "";
            newCategory = matchCategory(data.genre);
            logLog(`Auto-match data success for "${title}" -> Category: [${newCategory}]`);
        } else {
            logWarn(`No API match dataset returned for: "${title}". Using defaults.`);
        }

        movies.push({ name: title, img: newImg, category: newCategory, desc: newDesc });
        saveToStorage();
        render();

        inputEl.value = ""; inputEl.disabled = false; btnEl.disabled = false;
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => { modal.classList.remove("open"); });
}

if (closeViewModalBtn) {
    closeViewModalBtn.addEventListener("click", () => { 
        logLog("Closing read-only view modal window.");
        viewModal.classList.remove("open"); 
    });
}

const modalDeleteBtn = document.getElementById("modalDeleteBtn");
if (modalDeleteBtn) {
    modalDeleteBtn.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        if (editIndex === null || editIndex === undefined) return;
        deleteMovie(editIndex);
        modal.classList.remove("open");
        editIndex = null;
    });
}

const clearStorageBtn = document.getElementById("clearStorageBtn");
const clearPopup = document.getElementById("clearPopup");
const clearConfirmBtn = document.getElementById("clearConfirmBtn");
const clearCancelBtn = document.getElementById("clearCancelBtn");

if (clearStorageBtn && clearPopup) {
  clearStorageBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearPopup.classList.toggle("open");
  });
}

if (clearConfirmBtn) {
  clearConfirmBtn.addEventListener("click", () => {
    logWarn("Flushing all localStorage repository items!");
    localStorage.removeItem("cineflow_media");
    movies.length = 0;
    render();
    clearPopup.classList.remove("open");
  });
}

if (clearCancelBtn) {
  clearCancelBtn.addEventListener("click", () => {
    clearPopup.classList.remove("open");
  });
}

const debugLog = document.getElementById("debug-log");
function writeToConsole(msg, className) {
  if (debugLog) {
    const time = new Date().toLocaleTimeString();
    debugLog.innerHTML += `<div class="console-row ${className}">[${time}] ${msg}</div>`;
    debugLog.scrollTop = debugLog.scrollHeight;
  }
}
function logLog(msg) { writeToConsole(`[INFO] ${msg}`, "console-ok"); }
function logWarn(msg) { writeToConsole(`[WARN] ${msg}`, "console-warn"); }
function logError(msg) { writeToConsole(`[ERROR] ${msg}`, "console-err"); }

window.addEventListener("error", (e) => {
    logError(`Runtime Exception: ${e.message} at ${e.filename}:${e.lineno}`);
});

let logoTapCount = 0; let logoTapTimer = null;
const logoZone = document.querySelector(".logo-zone");
if (logoZone) {
  logoZone.addEventListener("click", () => {
    logoTapCount++;
    clearTimeout(logoTapTimer);
    logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 500);
    if (logoTapCount >= 3) {
      if (debugLog) debugLog.style.display = debugLog.style.display === "none" ? "block" : "none";
      logLog("DevConsole layout toggled via logo triple-tap shortcut.");
      logoTapCount = 0;
    }
  });
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    logLog("Outside click detected. Closing all open modal layer view systems.");
    modal.classList.remove("open");
    viewModal.classList.remove("open");
  }
  
  if (clearPopup && clearPopup.classList.contains("open") && !e.target.closest(".clear-storage-wrapper")) {
    clearPopup.classList.remove("open");
  }
});

document.addEventListener("DOMContentLoaded", () => {
    logLog("DOM Tree Parsing completed. Initializing CineFlow application system.");
    render();
});