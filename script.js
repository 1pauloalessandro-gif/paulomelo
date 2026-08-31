// Carrossel simples, sem dependências.
// initCarousel(el) monta um carrossel específico — chamado tanto no carregamento
// da página (carrosséis já presentes no HTML) quanto depois que o data.js
// insere as lâminas dinamicamente (banco de dados via Decap CMS).
function initCarousel(carousel) {
  var track = carousel.querySelector('.carousel-track');
  var slides = Array.prototype.slice.call(carousel.querySelectorAll('.carousel-slide'));
  var prevBtn = carousel.querySelector('.carousel-arrow.prev');
  var nextBtn = carousel.querySelector('.carousel-arrow.next');
  var dotsWrap = carousel.querySelector('.carousel-dots');
  var countEl = carousel.querySelector('.carousel-count');
  var index = 0;

  if (dotsWrap) dotsWrap.innerHTML = '';

  slides.forEach(function (_, i) {
    if (!dotsWrap) return;
    var dot = document.createElement('button');
    if (i === 0) dot.classList.add('active');
    dot.setAttribute('aria-label', 'Ir para imagem ' + (i + 1));
    dot.addEventListener('click', function () { goTo(i); });
    dotsWrap.appendChild(dot);
  });

  function update() {
    track.style.transform = 'translateX(-' + (index * 100) + '%)';
    if (dotsWrap) {
      dotsWrap.querySelectorAll('button').forEach(function (d, i) {
        d.classList.toggle('active', i === index);
      });
    }
    if (countEl) countEl.textContent = (index + 1) + ' / ' + slides.length;
  }

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    update();
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { goTo(index - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goTo(index + 1); });

  carousel.setAttribute('tabindex', '0');
  carousel.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') goTo(index - 1);
    if (e.key === 'ArrowRight') goTo(index + 1);
  });

  update();
}

document.addEventListener('DOMContentLoaded', function () {
  // Só inicializa aqui os carrosséis que já vêm prontos no HTML.
  // Se a página usa data.js, ele mesmo chama initCarousel depois de montar as lâminas.
  if (!document.body.hasAttribute('data-driven')) {
    document.querySelectorAll('.carousel').forEach(initCarousel);
  }
});
