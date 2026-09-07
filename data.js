// Busca o "banco de dados" (arquivos JSON em /content, editados pelo painel
// em /admin) e monta a página com o conteúdo atual — hero, lista de séries,
// e a grade de fotos de cada série.

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
  var track = document.getElementById('heroMarqueeTrack');
  if (!track) return;

  // Monta um "banco" com as fotos de todas as séries e preenche a faixa
  // do hero com elas (em ordem embaralhada) — a faixa rola continuamente
  // via CSS (.hero-marquee-track), então a home mostra fotos de todas as
  // séries em vez de uma capa fixa.
  try {
    var slugs = await loadSeriesOrder();
    var pool = [];
    for (var i = 0; i < slugs.length; i++) {
      try {
        var series = await loadSeries(slugs[i]);
        (series.plates || []).forEach(function (p) {
          if (p.image_webp) pool.push(p.image_webp);
        });
      } catch (e) {
        // série referenciada no índice mas sem arquivo ainda: ignora
      }
    }
    if (!pool.length) return; // sem fotos ainda: mantém o que já estiver no HTML

    // embaralha a ordem, assim a faixa fica diferente a cada carregamento
    for (var j = pool.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = pool[j]; pool[j] = pool[k]; pool[k] = tmp;
    }

    // duplica a lista (a faixa mostra 2 cópias seguidas) pra criar o loop
    // contínuo sem emenda — ver @keyframes hero-marquee-scroll em styles.css
    var doubled = pool.concat(pool);
    track.innerHTML = doubled.map(function (src) {
      return '<img src="' + src + '" alt="">';
    }).join('');

    // ajusta a duração da animação pela largura real da faixa, pra manter
    // uma velocidade parecida independente de quantas fotos existirem
    requestAnimationFrame(function () {
      var halfWidth = track.scrollWidth / 2;
      var pxPerSecond = 34;
      var duration = Math.max(20, halfWidth / pxPerSecond);
      track.style.animationDuration = duration + 's';
    });
  } catch (e) {
    // sem dado ainda: mantém o que já estiver no HTML
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

  // Grade de fotos + visualizador em tela cheia
  var grid = document.getElementById('platesGrid');
  var lightboxTrack = document.querySelector('#lightbox .lightbox-track');
  if (grid && lightboxTrack && data.plates && data.plates.length) {
    var gridHtml = '';
    var trackHtml = '';
    data.plates.forEach(function (p, idx) {
      var num = toRoman(idx + 1);
      var metaLine = [p.local, p.ano].filter(Boolean).join(', ');
      gridHtml += '' +
        '<button class="plate-cell">' +
        '<img src="' + p.image_webp + '" alt="' + p.title + '">' +
        '<span class="num mono">' + num + '</span>' +
        '<span class="cap">' +
        (p.title ? '<p class="title">' + p.title + '</p>' : '') +
        (metaLine ? '<p class="meta mono">' + metaLine + '</p>' : '') +
        '</span></button>';
      trackHtml += '' +
        '<div class="lightbox-slide">' +
        '<img src="' + p.image_webp + '" alt="' + p.title + '">' +
        '<div class="lightbox-caption">' +
        '<p class="num">' + num + '</p>' +
        (p.title ? '<p class="title">' + p.title + '</p>' : '') +
        (metaLine ? '<p class="meta mono">' + metaLine + '</p>' : '') +
        '</div></div>';
    });
    grid.innerHTML = gridHtml;
    lightboxTrack.innerHTML = trackHtml;
    if (window.initLightboxGrid) initLightboxGrid();
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
