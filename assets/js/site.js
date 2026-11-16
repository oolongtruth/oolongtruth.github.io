document.documentElement.classList.add('js');
// 各ページの <head> にある「site.js が読めなかったら隠すのをやめる」処理に、読めたことを伝える
window.siteReady = true;

var year = document.getElementById('year');
if (year) {
  year.textContent = new Date().getFullYear();
}

document.addEventListener('error', function(event) {
  var image = event.target;
  if (!(image instanceof HTMLImageElement)) {
    return;
  }

  if (image.hasAttribute('data-hide-on-error')) {
    image.style.display = 'none';
  }
  if (image.hasAttribute('data-icon-fallback') && image.parentNode) {
    image.parentNode.classList.add('is-empty');
  }
}, true);

// フェードインする要素（site.css のちらつき防止の一覧と同じにすること）
var targets = document.querySelectorAll('.hero-logo,.block h2,.block .lead-text,.profile,.portrait,.about-avatar,.about-heading,.activity-card,.wip,.gallery-title,.fold,.link-list li');
targets.forEach(function(element) {
  element.classList.add('reveal');
  var parent = element.parentNode;
  var unit = (element.matches('.link-list li') || !parent.className || parent.className.indexOf('col-') < 0) ? element : parent;
  var index = Array.prototype.indexOf.call(unit.parentNode.children, unit);
  // 同じ並び（リンク一覧・イラストの並びなど）に入っているものを1つのグループにまとめる
  var group = unit.parentNode;
  // トップ（index）: ロゴ → トップ画像の順に表示する（画面での並び順に関係なく固定）
  var hero = element.closest('.masthead');
  if (hero) {
    group = hero;
    index = element.matches('.hero-logo') ? 0 : 1;
  }
  element.style.setProperty('--i', Math.min(index, 6));
  if (!group._revealItems) {
    group._revealItems = [];
  }
  group._revealItems.push(element);
  element._revealGroup = group;
});

// 表示前の状態に「アニメーションなしで一瞬で」切り替える。
// そのまま .reveal を付けると「見えている → 透明」へのトランジション中に表示の合図が来て、フェードインしないように見えるため
function hideInstantly(elements) {
  Array.prototype.forEach.call(elements, function(element) {
    element.style.transition = 'none';
  });
  void document.body.offsetHeight;
  Array.prototype.forEach.call(elements, function(element) {
    element.style.transition = '';
  });
}
hideInstantly(targets);

function show(element) {
  // 2フレーム待ってから表示の合図を出し、表示前の状態が必ず一度描かれるようにする
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      element.classList.add('is-visible');
    });
  });
}

// グループ内の画像の読み込みが終わるまで待ってから cb を呼ぶ（最大 4 秒で打ち切り）。
// 画像の読み込み中にフェードインが進むと、フェードインが終わったあとで画像がパッと出るだけになり、
// フェードインしていないように見える（最初から画面内にある大きな画像＝トップで特に起きていた）
function whenImagesReady(elements, cb) {
  var pending = [];
  elements.forEach(function(element) {
    var images = element.tagName === 'IMG' ? [element] : element.querySelectorAll('img');
    Array.prototype.forEach.call(images, function(image) {
      if (!image.complete) {
        pending.push(image);
      }
    });
  });
  var done = false;
  function finish() {
    if (!done) {
      done = true;
      cb();
    }
  }
  if (!pending.length) {
    finish();
    return;
  }
  var left = pending.length;
  function step() {
    left -= 1;
    if (left <= 0) {
      finish();
    }
  }
  pending.forEach(function(image) {
    image.addEventListener('load', step, {once: true});
    image.addEventListener('error', step, {once: true});
  });
  setTimeout(finish, 4000);
}

// トップのローディング画面: ページの読み込みが終わったら、ロゴをフェードイン・フェードアウトさせてから画面全体を消す。
// ハートが一瞬で消えるとチラつくので、読み込み中の表示は最低 1 秒。読み込みが遅くても 6 秒で次へ進む
var loader = document.querySelector('.loader');
var loaderDone = !loader;
var loaderWaiting = [];
function whenLoaderDone(cb) {
  if (loaderDone) {
    cb();
  } else {
    loaderWaiting.push(cb);
  }
}
if (loader) {
  var loaderStarted = false;
  var finishLoading = function() {
    if (loaderStarted) {
      return;
    }
    loaderStarted = true;
    setTimeout(function() {
      // ハートを消してロゴを表示（ロゴの動きは site.css の loader-logo。0.3 秒待ってから 2.4 秒）
      loader.classList.add('is-logo');
      setTimeout(function() {
        loader.classList.add('is-done');
        // シャッターが半分くらい開いたところ（0.45 秒後）で、トップのロゴ・トップ画像のフェードインを始める
        setTimeout(function() {
          loaderDone = true;
          loaderWaiting.forEach(function(cb) {
            cb();
          });
          loaderWaiting = [];
        }, 450);
        // 開ききったら（0.9 秒後）ローディング画面を取り除く
        setTimeout(function() {
          loader.remove();
        }, 900);
      }, 2700);
    }, Math.max(0, 1000 - performance.now()));
  };
  if (document.readyState === 'complete') {
    finishLoading();
  } else {
    window.addEventListener('load', finishLoading);
  }
  setTimeout(finishLoading, 6000);
}

if (!('IntersectionObserver' in window)) {
  targets.forEach(show);
} else {
  // グループのどれか1つが画面に入ったら、グループ全体を上から順に表示する。
  // 1つずつ判定すると、画面の下端ぎりぎりにある最後の項目（例: リンク一覧の一番下）だけが
  // 判定に入らず、あとから遅れて表示されてしまうため
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var items = entry.target._revealGroup._revealItems;
        items.forEach(function(element) {
          observer.unobserve(element);
        });
        // ローディング画面が消えてから（トップ以外はすぐ）、画像の読み込みを待って表示する
        whenLoaderDone(function() {
          whenImagesReady(items, function() {
            items.forEach(show);
          });
        });
      }
    });
  }, {threshold: 0, rootMargin: '0px 0px -5% 0px'});
  targets.forEach(function(element) {
    observer.observe(element);
  });
}

// 戻る・進むでページが復元されたときも、もう一度フェードインさせる
window.addEventListener('pageshow', function(event) {
  if (!event.persisted) {
    return;
  }
  targets.forEach(function(element) {
    element.classList.remove('is-visible');
  });
  hideInstantly(targets);
  targets.forEach(function(element) {
    if (observer) {
      observer.observe(element);
    } else {
      show(element);
    }
  });
});

// 折りたたみ（details.fold）の開閉をアニメーションさせる。
// <details> は標準だと一瞬で開閉するので、クリックを横取りして中身（.fold-body）の高さを動かす
document.querySelectorAll('details.fold').forEach(function(details) {
  var summary = details.querySelector('summary');
  var body = details.querySelector('.fold-body');
  if (!summary || !body || !body.animate) {
    return;
  }
  var animation = null;
  var options = {duration: 400, easing: 'ease'};

  summary.addEventListener('click', function(event) {
    event.preventDefault();
    if (animation) {
      return; // アニメーション中のクリックは無視する
    }
    if (details.open) {
      // 閉じる: 今の高さ → 0 まで縮めてから閉じる
      details.classList.add('is-closing');
      animation = body.animate({height: [body.offsetHeight + 'px', '0px'], opacity: [1, 0]}, options);
      animation.onfinish = function() {
        details.open = false;
        details.classList.remove('is-closing');
        animation = null;
      };
    } else {
      // 開く: 先に開いて中身の高さを測り、0 → その高さまで伸ばす
      details.open = true;
      animation = body.animate({height: ['0px', body.offsetHeight + 'px'], opacity: [0, 1]}, options);
      animation.onfinish = function() {
        animation = null;
      };
    }
  });
});

// キャラクターシート・イラストの画像を押すと、画面の中央に大きく表示する（もう一度押すか Esc で閉じる）
var zoomTargets = document.querySelectorAll('.portrait.sheet,.gallery-item .portrait');
if (zoomTargets.length) {
  var lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', '画像の拡大表示');
  lightbox.innerHTML = '<img alt=""><button type="button" class="lightbox-close" aria-label="閉じる">×</button>';
  document.body.appendChild(lightbox);
  var lightboxImage = lightbox.querySelector('img');
  var lightboxClose = lightbox.querySelector('.lightbox-close');
  var lastFocus = null;

  var openLightbox = function(portrait, image) {
    // 表示用に縮小した画像のときは、元の大きな画像（data-full）を表示する
    lightboxImage.src = image.getAttribute('data-full') || image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    // 透過画像のときに後ろが透けないよう、元の枠と同じ背景色を敷く
    lightboxImage.style.background = getComputedStyle(portrait).backgroundColor;
    lastFocus = document.activeElement;
    lightbox.classList.add('is-open');
    document.documentElement.classList.add('lightbox-lock');
    lightboxClose.focus();
  };
  var closeLightbox = function() {
    if (!lightbox.classList.contains('is-open')) {
      return;
    }
    lightbox.classList.remove('is-open');
    document.documentElement.classList.remove('lightbox-lock');
    if (lastFocus) {
      lastFocus.focus();
    }
  };

  lightbox.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closeLightbox();
    }
  });

  zoomTargets.forEach(function(portrait) {
    var image = portrait.querySelector('img');
    if (!image) {
      return;
    }
    portrait.classList.add('is-zoomable');
    portrait.tabIndex = 0;
    portrait.setAttribute('role', 'button');
    portrait.setAttribute('aria-label', (image.alt || '画像') + 'を拡大して見る');
    var open = function() {
      // 画像が読み込めなかったとき（仮の文字だけのとき）は開かない
      if (image.style.display === 'none') {
        return;
      }
      openLightbox(portrait, image);
    };
    portrait.addEventListener('click', open);
    portrait.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });
}

// ヘッダー部分（トップ・各ページの見出し）に、上から下へ落ちる薄いハートを置く。
// 位置・大きさ・速さは毎回ランダム。開始を負の値でずらし、最初から画面全体に散らばった状態にする
document.querySelectorAll('.masthead,.page-head').forEach(function(head) {
  var layer = document.createElement('div');
  layer.className = 'falling-hearts';
  layer.setAttribute('aria-hidden', 'true');
  var count = head.classList.contains('masthead') ? 14 : 8; // ハートの数（トップは縦に長いので多め）
  for (var n = 0; n < count; n++) {
    var heart = document.createElement('i');
    var duration = 10 + Math.random() * 8;                                  // 落ちきるまで 10〜18 秒
    heart.style.setProperty('--x', ((n + Math.random()) / count * 100) + '%'); // 横に均等にばらす
    heart.style.setProperty('--size', (40 + Math.random() * 90) + 'px');      // 大きさ 40〜130px
    heart.style.setProperty('--duration', duration + 's');
    heart.style.setProperty('--delay', (-Math.random() * duration) + 's');
    layer.appendChild(heart);
  }
  head.insertBefore(layer, head.firstChild);
});

// アイコン（自分の紹介）と工事中の乃愛: クリックすると、押し込まれたように縮んで弾む（動きは site.css の click-press）
document.querySelectorAll('.about-avatar,.wip-img').forEach(function(element) {
  element.addEventListener('click', function() {
    // クラスを付け直して、連続で押してもアニメーションが最初から動くようにする
    element.classList.remove('is-clicked');
    void element.offsetWidth;
    element.classList.add('is-clicked');
  });
  element.addEventListener('animationend', function(event) {
    if (event.target === element) {
      element.classList.remove('is-clicked');
    }
  });
});
