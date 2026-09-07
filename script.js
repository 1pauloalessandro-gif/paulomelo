// Grade de fotos + visualizador em tela cheia, sem dependências.
// initLightboxGrid() liga os cliques da grade (#platesGrid) ao visualizador (#lightbox),
// com navegação lateral por arraste, roda do mouse, setas na tela e teclado.
// Chamado tanto no carregamento da página (grade já pronta no HTML) quanto depois
// que o data.js insere as fotos dinamicamente (banco de dados via CMS).
function initLightboxGrid() {
  var grid = document.getElementById('platesGrid');
  var lightbox = document.getElementById('lightbox');
  if (!grid || !lightbox) return;

  var track = lightbox.querySelector('.lightbox-track');
  var countEl = lightbox.querySelector('.lightbox-count');
  var closeBtn = lightbox.querySelector('.lightbox-close');
  var prevBtn = lightbox.querySelector('.lightbox-arrow.prev');
  var nextBtn = lightbox.querySelector('.lightbox-arrow.next');
  var slides = Array.prototype.slice.call(track.querySelectorAll('.lightbox-slide'));
  var current = 0;

  function updateCount() {
    if (countEl) countEl.textContent = (current + 1) + ' / ' + slides.length;
  }

  function scrollToIndex(i, smooth) {
    current = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: current * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    updateCount();
  }

  function open(i) {
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    scrollToIndex(i, false);
  }

  function close() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  grid.querySelectorAll('.plate-cell').forEach(function (cell, i) {
    cell.addEventListener('click', function () { open(i); });
  });

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (prevBtn) prevBtn.addEventListener('click', function () { scrollToIndex(current - 1, true); });
  if (nextBtn) nextBtn.addEventListener('click', function () { scrollToIndex(current + 1, true); });

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') scrollToIndex(current + 1, true);
    if (e.key === 'ArrowLeft') scrollToIndex(current - 1, true);
  });

  // Roda do mouse (vertical) também navega lateralmente — trackpad já rola de lado sozinho.
  track.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      track.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  // Mantém o contador sincronizado ao arrastar/rolar manualmente.
  var scrollTimeout;
  track.addEventListener('scroll', function () {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(function () {
      current = Math.round(track.scrollLeft / track.clientWidth);
      updateCount();
    }, 80);
  });

  updateCount();
}

// Header fixo que some ao rolar pra baixo e volta ao rolar pra cima.
// Roda em todas as páginas (o <nav> é igual em todas), independente de data.js.
function initAutoHideNav() {
  var nav = document.querySelector('nav');
  if (!nav) return;

  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    if (y > lastY && y > 120) {
      nav.classList.add('nav-hidden'); // rolando pra baixo, além do topo: esconde
    } else if (y < lastY) {
      nav.classList.remove('nav-hidden'); // rolando pra cima: mostra
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', function () {
  initAutoHideNav();
  // Só inicializa aqui a grade que já vem pronta no HTML (sem data.js).
  // Se a página usa data.js, ele mesmo chama initLightboxGrid depois de montar as fotos.
  if (!document.body.hasAttribute('data-driven')) {
    initLightboxGrid();
  }
});
