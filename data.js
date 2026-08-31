// Busca o "banco de dados" (arquivos JSON em /content, editados pelo painel
// em /admin) e monta a página com o conteúdo atual — hero, lista de séries,
// e as lâminas do carrossel de cada série.

async function fetchJSON(path) {
  var res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error('não encontrado: ' + path);
  return res.json();
}

function toRoman(n) {
  var map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  var res = '';
  map.forEach(function (pair) {
    while (n >= pair[0]) { res += pair[1]; n -= pair[0]; }
  });
  return res;
}

async function loadHero() {
  var wrap = document.querySelector('.hero');
  if (!wrap) return;
  try {
    var hero = await fetchJSON('content/hero.json');
    var source = wrap.querySelector('picture source');
    var img = wrap.querySelector('picture img');
    if (source && hero.image_webp) source.setAttribute('srcset', hero.image_webp);
    if (img) {
      if (hero.image_jpg) img.setAttribute('src', hero.image_jpg);
      if (hero.alt) img.setAttribute('alt', hero.alt);
    }
  } catch (e) {
    // sem dado ainda: mantém a imagem que já está no HTML
  }
}

async function loadSeriesOrder() {
  try {
    var idx = await fetchJSON('content/series-index.json');
    return idx.order || [];
  } catch (e) {
    return [];
  }
}

async function loadSeries(slug) {
  return fetchJSON('content/series/' + slug + '.json');
}

function seriePageHref(slug) {
  return 'serie-' + slug + '.html';
}

async function renderHomeSeries() {
  var menuList = document.querySelector('.series-menu--home ul');
  var grid = document.querySelector('.series-index-grid');
  if (!menuList || !grid) return;

  var slugs = await loadSeriesOrder();
  if (!slugs.length) return; // sem dado ainda: mantém o HTML estático como está

  var menuHtml = '';
  var gridHtml = '';
  var i = 1;

  for (var s = 0; s < slugs.length; s++) {
    var slug = slugs[s];
    var data;
    try {
      data = await loadSeries(slug);
    } catch (e) {
      continue; // série referenciada no índice mas sem arquivo ainda
    }
    var num = i < 10 ? '0' + i : '' + i;
    var href = seriePageHref(slug);
    var count = (data.plates || []).length;
    var metaParts = [];
    if (data.local) metaParts.push(data.local);
    if (data.ano) metaParts.push(data.ano);
    metaParts.push(count + (count === 1 ? ' imagem' : ' imagens'));

    menuHtml += '<li><a href="' + href + '"><span class="n">' + num + '</span> ' + data.title + '</a></li>';
    gridHtml += '' +
      '<a class="series-card" href="' + href + '">' +
      '<img src="' + data.cover + '" alt="Capa da série ' + data.title + '">' +
      '<div class="label">' +
      '<p class="name">' + data.title + '</p>' +
      '<p class="meta mono">' + metaParts.join(' — ') + '</p>' +
      '</div>' +
      '</a>';
    i++;
  }

  menuList.innerHTML = menuHtml;
  grid.innerHTML = gridHtml;
}

async function renderSeriePage(slug) {
  var data;
  try {
    data = await loadSeries(slug);
  } catch (e) {
    return; // sem dado ainda: mantém o HTML estático como está
  }

  document.title = data.title + ' — Paulo Melo';

  var h1 = document.querySelector('.series-header h1');
  var meta = document.querySelector('.series-header .meta');
  var intro = document.querySelector('.series-header .intro');
  if (h1) h1.textContent = data.title;
  if (meta) {
    var metaParts = [];
    if (data.local) metaParts.push(data.local);
    if (data.ano) metaParts.push(data.ano);
    var count = (data.plates || []).length;
    metaParts.push(count + (count === 1 ? ' imagem' : ' imagens'));
    meta.textContent = metaParts.join(', ');
  }
  if (intro && data.intro) intro.textContent = data.intro;

  // Menu lateral com todas as séries, destacando a atual
  var menuList = document.querySelector('.series-menu ul');
  var slugs = await loadSeriesOrder();
  if (menuList && slugs.length) {
    var menuHtml = '';
    for (var i = 0; i < slugs.length; i++) {
      var sl = slugs[i];
      var num = (i + 1) < 10 ? '0' + (i + 1) : '' + (i + 1);
      var title = sl === slug ? data.title : sl;
      try {
        if (sl !== slug) { var other = await loadSeries(sl); title = other.title; }
      } catch (e) { /* mantém o slug como nome se o arquivo não existir */ }
      var curClass = sl === slug ? ' class="current"' : '';
      menuHtml += '<li><a' + curClass + ' href="' + seriePageHref(sl) + '"><span class="n">' + num + '</span> ' + title + '</a></li>';
    }
    menuList.innerHTML = menuHtml;
  }

  // Lâminas do carrossel
  var track = document.querySelector('.carousel-track');
  if (track && data.plates && data.plates.length) {
    var html = '';
    data.plates.forEach(function (p, idx) {
      var num = toRoman(idx + 1);
      var metaLine = [p.local, p.ano].filter(Boolean).join(', ');
      html += '' +
        '<div class="carousel-slide">' +
        '<div class="slide-img"><picture>' +
        (p.image_webp ? '<source srcset="' + p.image_webp + '" type="image/webp">' : '') +
        '<img src="' + p.image_jpg + '" alt="' + p.title + '"></picture></div>' +
        '<div class="slide-info">' +
        '<p class="plate-num">' + num + '</p>' +
        '<h3>' + p.title + '</h3>' +
        (metaLine ? '<p class="meta mono">' + metaLine + '</p>' : '') +
        (p.desc ? '<p class="desc">' + p.desc + '</p>' : '') +
        '</div></div>';
    });
    track.innerHTML = html;
    var carouselEl = document.querySelector('.carousel');
    if (carouselEl && window.initCarousel) initCarousel(carouselEl);
  }

  // Rodapé: link pra próxima série
  var slugsForPager = slugs.length ? slugs : [];
  var pos = slugsForPager.indexOf(slug);
  if (pos !== -1 && slugsForPager.length > 1) {
    var nextSlug = slugsForPager[(pos + 1) % slugsForPager.length];
    var nextData;
    try { nextData = await loadSeries(nextSlug); } catch (e) { nextData = { title: nextSlug }; }
    var nextLink = document.querySelector('.series-pager .next-name');
    var nextAnchor = document.querySelector('.series-pager a[href^="serie-"]');
    if (nextAnchor) nextAnchor.setAttribute('href', seriePageHref(nextSlug));
    if (nextLink) nextLink.textContent = nextData.title + ' →';
  }
}
