const OMDB_KEY = "trilogy";

const storedMovies = localStorage.getItem("favourite_books");
const movies = storedMovies ? JSON.parse(storedMovies) : [];

let currentFilter = "All";
let isFilterBarInitialized = false;
const btnData = [];

function saveToStorage() {
  localStorage.setItem("favourite_books", JSON.stringify(movies));
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
  } catch {
    return null;
  }
}

function matchCategory(omdbGenreString) {
  if (!omdbGenreString) return "Sci-Fi";
  const genres = omdbGenreString.split(",").map(g => g.trim().toLowerCase());
  
  const mapping = {
    "fantasy-adventure": ["fantasy", "adventure"],
    "animated": ["animation", "animated"],
    "fantasy-romance": ["romance", "fantasy"],
    "adventure": ["adventure"],
    "sci-fi": ["sci-fi", "science fiction"],
    "horror": ["horror"],
    "thriller": ["thriller", "mystery"],
    "drama": ["drama"],
    "action": ["action"],
    "comedy": ["comedy"]
  };

  for (const [catKey, keywords] of Object.entries(mapping)) {
    for (const keyword of keywords) {
      if (genres.includes(keyword)) {
        return catKey.charAt(0).toUpperCase() + catKey.slice(1);
      }
    }
  }
  return "Sci-Fi";
}

const moviesList = document.getElementById("booksList");
const modal = document.getElementById("bookModal");
const closeModalBtn = document.getElementById("closeModal");
const form = document.getElementById("bookForm");
const quickAddForm = document.getElementById("quickAddForm");
const quickAddInput = document.getElementById("quickAddInput");
let editIndex = null;

function createMovieCard({ name, img, desc, category }, index) {
  return `
    <div class="books-card" data-index="${index}" id="movieCard-${index}">
      <div class="books-body">
        <div class="image-container loading" id="imgContainer-${index}">
          <span class="card-category-badge">${category}</span>
          <img src="" class="books-image" id="img-${index}" alt="${name}" />
        </div>
        <div class="books-title">${name}</div>
        <div class="books-text">${desc}</div>
      </div>
      <div class="books-actions">
        <button class="icon-btn edit" title="Edit" onclick="editMovie(${index})">
          <i class="fa-regular fa-pen-to-square"></i>
        </button>
        <button class="icon-btn delete" title="Delete" onclick="deleteMovie(${index})">
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
    }
  }

  if (finalSrc) {
    imgEl.src = finalSrc;
    imgEl.onload = () => {
      containerEl.classList.remove("loading");
      imgEl.classList.add("loaded");
    };
    imgEl.onerror = () => {
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

function initTiltEffect() {
  const cards = document.querySelectorAll(".books-card");
  
  cards.forEach(card => {
    let reqId = null;
    let targetX = 0;
    let targetY = 0;
    let targetScale = 1;
    let currentX = 0;
    let currentY = 0;
    let currentScale = 1;
    let isHovered = false;
    
    let lastLeft = card.offsetLeft;
    let lastTop = card.offsetTop;
    let internalX = 0;
    let internalY = 0;

    if (reqId) {
      cancelAnimationFrame(reqId);
      reqId = null;
    }

    function updateAnimation() {
      const currentLeft = card.offsetLeft;
      const currentTop = card.offsetTop;
      
      if (currentLeft !== lastLeft || currentTop !== lastTop) {
        internalX += lastLeft - currentLeft;
        internalY += lastTop - currentTop;
        lastLeft = currentLeft;
        lastTop = currentTop;
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
      const width = rect.width;
      const height = rect.height;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      targetX = ((x - (width / 2)) / (width / 2)) * 3;
      targetY = ((y - (height / 2)) / (height / 2)) * 3;
    });
    
    card.addEventListener("mouseenter", () => {
      isHovered = true;
      targetScale = 1.04;
      card.style.transition = "box-shadow 0.3s ease";
    });
    
    card.addEventListener("mouseleave", () => {
      isHovered = false;
      targetX = 0;
      targetY = 0;
      targetScale = 1;
    });
  });
}

function updateFilterVisibility() {
  const usedCategories = new Set(movies.map(m => m.category.toLowerCase()));
  document.querySelectorAll(".filter-btn").forEach(btn => {
    if (btn.id === "filterAll") return;
    const label = btn.textContent.trim().toLowerCase();
    const hasItems = usedCategories.has(label);
    btn.style.display = hasItems ? "" : "none";
    if (!hasItems && btn.classList.contains("active")) {
      btn.classList.remove("active");
      document.getElementById("filterAll").classList.add("active");
      currentFilter = "All";
    }
  });
}

function initFilterBarAnimation() {
  const filterBar = document.querySelector(".filter-bar");
  if (!filterBar || isFilterBarInitialized) return;
  
  const filterBtns = filterBar.querySelectorAll(".filter-btn, button");
  btnData.length = 0;

  filterBtns.forEach(btn => {
    btnData.push({
      element: btn,
      lastLeft: btn.offsetLeft,
      lastTop: btn.offsetTop,
      currentX: 0,
      currentY: 0
    });
  });

  isFilterBarInitialized = true;
  requestAnimationFrame(updateBarAnimation);
}

function updateBarAnimation() {
  btnData.forEach(data => {
    const currentLeft = data.element.offsetLeft;
    const currentTop = data.element.offsetTop;

    if (currentLeft !== data.lastLeft || currentTop !== data.lastTop) {
      data.currentX += data.lastLeft - currentLeft;
      data.currentY += data.lastTop - currentTop;
      data.lastLeft = currentLeft;
      data.lastTop = currentTop;
    }

    data.currentX += (0 - data.currentX) * 0.1;
    data.currentY += (0 - data.currentY) * 0.1;

    if (Math.abs(data.currentX) > 0.01 || Math.abs(data.currentY) > 0.01) {
      data.element.style.transform = `translate(${data.currentX}px, ${data.currentY}px)`;
    } else {
      data.element.style.transform = "";
    }
  });

  requestAnimationFrame(updateBarAnimation);
}

function render() {
  updateFilterVisibility();
  const filteredMovies = movies.filter(m => currentFilter === "All" || m.category.toLowerCase() === currentFilter.toLowerCase());

  if (!filteredMovies.length) {
    const isEmpty = movies.length === 0;
    moviesList.innerHTML = `
    <div class="empty">
      <h3>Your collection is empty</h3>
      <p style="font-size:0.875rem;margin-top:5px;">${isEmpty ? "Type a movie title in the top search field and press Enter to start." : "Try changing filters."}</p>
    </div>`;
    
    if (!isFilterBarInitialized) {
      initFilterBarAnimation();
    }
    return;
  }

  moviesList.innerHTML = filteredMovies.map((movie, i) => createMovieCard(movie, i)).join("");

  filteredMovies.forEach((movie, i) => {
    loadImageForCard(movie, i);
  });
  
  initTiltEffect();
  
  if (!isFilterBarInitialized) {
    initFilterBarAnimation();
  }
}

function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

quickAddForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const titleValue = quickAddInput.value.trim();
  if (!titleValue) return;

  quickAddInput.blur();
  quickAddInput.disabled = true;
  quickAddInput.placeholder = "Searching and generating card...";

  const omdbData = await fetchOmdbData(titleValue);
  
  let descValue = "No description available.";
  let categoryValue = "Sci-Fi";
  let finalImg = "";

  if (omdbData) {
    descValue = omdbData.plot || descValue;
    categoryValue = matchCategory(omdbData.genre);
    finalImg = omdbData.poster || "";
  }

  const newMovie = {
    name: titleValue,
    img: finalImg,
    desc: descValue,
    category: categoryValue
  };

  movies.push(newMovie);
  saveToStorage();
  
  quickAddInput.value = "";
  quickAddInput.disabled = false;
  quickAddInput.placeholder = "Search movie...";
  
  render();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = form.querySelector(".submit-btn");
  submitBtn.textContent = "Saving...";
  submitBtn.disabled = true;

  const titleValue = document.getElementById("bookName").value.trim();
  const urlValue = document.getElementById("bookImg").value.trim();
  let descValue = document.getElementById("bookDesc").value.trim();
  let categoryValue = document.getElementById("bookCategory").value;
  const fileInput = document.getElementById("bookFile");
  
  let finalImg = urlValue;

  if (fileInput.files && fileInput.files[0]) {
    try {
      finalImg = await getBase64(fileInput.files[0]);
    } catch (err) {
      console.error(err);
    }
  } else if (editIndex !== null && !urlValue) {
    finalImg = movies[editIndex].img;
  }

  const movieData = {
    name: titleValue,
    img: finalImg,
    desc: descValue,
    category: categoryValue,
  };

  if (editIndex !== null) {
    movies[editIndex] = movieData;
  }

  saveToStorage();
  submitBtn.textContent = "Save Changes";
  submitBtn.disabled = false;
  modal.classList.remove("open");
  render();
});

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    
    if (e.target.id === "filterAll") {
      currentFilter = "All";
    } else {
      currentFilter = e.target.textContent.trim();
    }
    render();
  });
});

closeModalBtn.addEventListener("click", () => modal.classList.remove("open"));
modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); });

document.getElementById("bookFile").addEventListener("change", function(e) {
  const wrapper = document.getElementById("fileUploadWrapper");
  const text = document.getElementById("fileUploadText");
  if (this.files && this.files[0]) {
    wrapper.classList.add("file-selected");
    text.innerHTML = `<i class="fa-solid fa-check"></i> ${this.files[0].name}`;
  } else {
    wrapper.classList.remove("file-selected");
    text.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Choose New Image File';
  }
});

window.editMovie = function (index) {
  editIndex = index;
  const movie = movies[index];

  document.getElementById("bookName").value = movie.name;
  document.getElementById("bookImg").value = movie.img.startsWith("data:image") ? "" : movie.img;
  document.getElementById("bookDesc").value = movie.desc;
  document.getElementById("bookCategory").value = movie.category;
  
  const fileInput = document.getElementById("bookFile");
  fileInput.value = "";
  document.getElementById("fileUploadWrapper").classList.remove("file-selected");
  document.getElementById("fileUploadText").innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Choose New Image File';

  modal.classList.add("open");
};

window.deleteMovie = function (index) {
  const card = document.getElementById(`movieCard-${index}`);
  if (card) {
    card.classList.add("card-fade-out");
    card.addEventListener("animationend", () => {
      movies.splice(index, 1);
      saveToStorage();
      render();
    }, { once: true });
  } else {
    movies.splice(index, 1);
    saveToStorage();
    render();
  }
};

document.addEventListener("DOMContentLoaded", render);