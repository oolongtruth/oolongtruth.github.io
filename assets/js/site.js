document.documentElement.classList.add('js');
// head 内の「4秒後に .js を外す」処理を止める
window.siteReady = true;

// 画像の保存防止（右クリック・ドラッグを無効）
document.addEventListener('contextmenu', function(event) {
  event.preventDefault();
});
document.addEventListener('dragstart', function(event) {
  if (event.target instanceof HTMLImageElement) {
    event.preventDefault();
  }
});

var year = document.getElementById('year');
if (year) {
  year.textContent = new Date().getFullYear();
}

// 読み込めなかった画像を隠す（枠の中の文字が見える）
document.addEventListener('error', function(event) {
  var image = event.target;
  if (image instanceof HTMLImageElement && image.hasAttribute('data-hide-on-error')) {
    image.style.display = 'none';
  }
}, true);

// フェードイン対象（site.css のちらつき防止の一覧と同じにすること）
var targets = document.querySelectorAll('.hero-logo,.block h2,.block .lead-text,.profile,.portrait,.char-serif,.about-avatar,.about-heading,.activity-card,.wip,.gallery-title,.fold,.link-list li');
targets.forEach(function(element) {
  element.classList.add('reveal');
  var parent = element.parentNode;
  var unit = (element.matches('.link-list li') || !parent.className || parent.className.indexOf('col-') < 0) ? element : parent;
  var index = Array.prototype.indexOf.call(unit.parentNode.children, unit);
  // 同じ並びのものを1グループにまとめる
  var group = unit.parentNode;
  // トップはロゴ → トップ画像の順に固定
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

// 表示前の状態へトランジションなしで切り替える（途中で表示の合図が来るとフェードインしないため）
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
  // 表示前の状態が一度描かれてから表示する
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      element.classList.add('is-visible');
    });
  });
}

// 画像の読み込みを待ってから cb を呼ぶ（最大 4 秒）。読み込み中にフェードインすると画像だけ遅れて出るため
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

// ローディング画面（トップ。読み込み中の表示は最低 1 秒、最長 6 秒）
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
      // ロゴ表示（site.css の loader-logo と時間を合わせる）
      loader.classList.add('is-logo');
      setTimeout(function() {
        loader.classList.add('is-done');
        // シャッターが半分開いたらフェードイン開始
        setTimeout(function() {
          loaderDone = true;
          loaderWaiting.forEach(function(cb) {
            cb();
          });
          loaderWaiting = [];
        }, 450);
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
  // グループ単位で表示する（1つずつだと画面下端の項目だけ遅れて表示されるため）
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var items = entry.target._revealGroup._revealItems;
        items.forEach(function(element) {
          observer.unobserve(element);
        });
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

// 戻る・進むで復元されたときもフェードインし直す
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

// 折りたたみの開閉アニメーション（details は標準だと一瞬で開閉するため）
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
      return;
    }
    if (details.open) {
      details.classList.add('is-closing');
      animation = body.animate({height: [body.offsetHeight + 'px', '0px'], opacity: [1, 0]}, options);
      animation.onfinish = function() {
        details.open = false;
        details.classList.remove('is-closing');
        animation = null;
      };
    } else {
      details.open = true;
      animation = body.animate({height: ['0px', body.offsetHeight + 'px'], opacity: [0, 1]}, options);
      animation.onfinish = function() {
        animation = null;
      };
    }
  });
});

// 画像の拡大表示（キャラクターシート・イラスト）
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
    // 縮小版のときは元画像（data-full）を表示
    lightboxImage.src = image.getAttribute('data-full') || image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    // 透過部分には元の枠と同じ背景色を敷く
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
      // 画像が読めなかったときは開かない
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

// ヘッダー部分の落ちるハート。開始を負の値でずらし、最初から散らばった状態にする
document.querySelectorAll('.masthead,.page-head').forEach(function(head) {
  var layer = document.createElement('div');
  layer.className = 'falling-hearts';
  layer.setAttribute('aria-hidden', 'true');
  var count = head.classList.contains('masthead') ? 14 : 8;
  for (var n = 0; n < count; n++) {
    var heart = document.createElement('i');
    var duration = 10 + Math.random() * 8;
    heart.style.setProperty('--x', ((n + Math.random()) / count * 100) + '%');
    heart.style.setProperty('--size', (40 + Math.random() * 90) + 'px');
    heart.style.setProperty('--duration', duration + 's');
    heart.style.setProperty('--delay', (-Math.random() * duration) + 's');
    layer.appendChild(heart);
  }
  head.insertBefore(layer, head.firstChild);
});

// クリック時の弾む動き（アイコン・工事中の乃愛）
document.querySelectorAll('.about-avatar,.wip-img').forEach(function(element) {
  element.addEventListener('click', function() {
    // 連続で押しても最初から動くよう付け直す
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

// カーソルがキャラの上（透明でない部分）にあるかを調べる関数を作る。
// file:// では画像の透明度を読み取れないため、形はデータ（横200マス）で持つ。画像の形を変えたら作り直すこと
function makeShapeTest(image, maskData) {
  var mask = null;
  return function(clientX, clientY) {
    if (!mask) {
      var size = maskData.split(':')[0].split('x');
      var w = +size[0], h = +size[1], data = new Uint8Array(w * h), pos = 0;
      maskData.split(':')[1].split(',').forEach(function(run, i) {
        var length = parseInt(run, 36);
        if (i % 2) {
          data.fill(1, pos, pos + length);
        }
        pos += length;
      });
      mask = {w: w, h: h, data: data};
    }
    var rect = image.getBoundingClientRect();
    var u = (clientX - rect.left) / rect.width;
    var v = (clientY - rect.top) / rect.height;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) {
      return false;
    }
    return mask.data[Math.floor(v * mask.h) * mask.w + Math.floor(u * mask.w)] === 1;
  };
}

// トップ画像: キャラの上でだけホバー・クリックを有効にする
var heroLink = document.querySelector('.portrait-link');
var heroImage = heroLink && heroLink.querySelector('img');
if (heroImage) {
  var heroTest = makeShapeTest(heroImage, '200x350:5xu,5,59,c,53,i,4x,n,4l,10,4h,13,4e,16,4c,18,4a,1d,46,1g,3v,1q,3o,1x,3j,22,3f,25,3b,2a,38,2d,36,2f,35,2f,35,2f,35,2g,34,2h,33,2i,33,2h,33,2i,33,2i,33,2h,34,2h,33,2i,33,2h,34,2h,34,2h,34,2h,34,2h,34,2i,32,2j,31,2k,2z,2n,2x,2o,2w,2q,2t,2s,2s,2t,2r,2v,2p,2w,2o,24,1,s,2m,30,2k,26,1,u,2j,26,2,u,10,4,1d,28,2,u,y,7,1b,28,3,u,x,8,1a,29,3,u,v,a,19,29,4,u,u,a,18,2a,5,u,8,9,b,c,17,2b,5,u,3,h,7,c,17,2c,5,1f,5,c,16,2d,6,1g,3,d,14,2f,6,1g,1,f,13,2f,7,1w,11,2h,7,1x,z,2i,8,1v,y,2j,9,1u,x,2l,9,1t,x,2m,a,1q,w,j,1,24,a,1q,v,k,1,25,b,1n,v,l,2,25,b,q,7,p,u,m,2,26,a,q,6,q,t,m,4,26,8,s,5,r,q,o,4,26,8,s,5,r,p,o,5,27,6,u,4,r,o,p,5,28,4,v,4,q,o,p,6,29,3,w,3,o,p,q,5,2b,1,x,4,n,o,q,6,39,6,m,m,q,7,3a,7,k,l,r,6,3b,9,i,k,r,7,2q,1,k,9,i,j,r,8,2q,1,l,8,i,i,r,7,2r,3,k,8,i,h,r,7,2s,3,k,8,h,h,r,7,2s,5,j,8,h,g,r,7,2s,6,j,8,6,2,7,h,r,8,2s,6,j,8,6,5,2,j,q,8,2t,7,j,7,5,q,p,a,2u,6,j,8,3,q,p,a,2w,5,j,11,o,b,2x,4,j,10,o,8,32,3,j,10,n,7,35,2,j,10,m,6,38,1,j,z,m,5,3u,z,m,4,3v,y,m,5,3v,y,l,5,3v,z,l,5,3v,z,k,5,3w,z,5,1,e,5,3v,10,5,1,d,5,3w,10,i,6,3w,10,i,6,3w,10,i,6,3w,10,h,7,3w,11,g,7,3v,12,g,6,3w,12,f,8,3v,13,e,8,3u,17,b,7,3v,17,b,6,3w,17,b,6,3v,18,b,5,3v,19,c,4,3v,19,c,4,3q,1,3,1a,c,3,3r,1e,d,2,3q,1f,d,2,3q,1f,d,2,3q,1f,44,1h,43,1j,a,1,3p,1k,8,3,3p,1l,8,3,3n,1m,8,3,3n,1n,8,2,3m,1p,7,2,3l,1q,8,2,3j,1s,7,2,3i,1v,5,2,3g,1z,2,4,3d,27,3c,29,3a,2b,38,2c,39,2c,39,2c,39,2c,3,1,35,2g,35,2f,36,2f,35,2g,35,2g,35,2h,34,2j,31,2k,31,2k,30,2m,2z,2r,2t,2s,2s,2v,2p,2z,2l,30,2k,30,2l,2z,2l,2z,2l,2z,2k,30,2k,30,2k,30,2k,30,2k,31,2j,31,2k,30,2l,2z,2l,2z,2l,2z,2l,30,2k,30,2j,31,2i,32,2i,32,2i,32,2h,34,2f,35,2f,35,2f,35,2e,36,2d,38,2b,39,2b,39,2b,39,2a,3a,2a,3b,27,3d,27,n,5,2l,27,1,3,g,a,2j,2c,d,c,2j,2e,8,g,2i,2f,4,k,2h,2g,2,l,2i,32,2i,32,2i,33,2i,32,2i,32,2j,31,2j,31,2k,30,2l,2z,2l,2y,2n,2v,2q,2u,2r,2u,2q,2u,2s,2t,2s,2s,2s,2t,2t,2r,2u,2r,2u,2q,2x,1z,2,n,2x,1x,4,m,2x,1v,7,l,2x,1q,c,l,2x,1p,d,l,2x,1n,g,k,2x,1m,h,k,2x,1l,i,k,2x,1e,q,j,2x,1c,s,j,2x,1a,v,h,2y,18,x,h,2y,16,10,f,2z,14,13,c,30,13,17,8,32,11,1c,2,36,z,4l,z,4l,z,4m,z,4l,10,4l,10,4l,10,4l,z,4n,y,4w,p,4v,p,4v,p,4v,q,4u,q,4v,p,4v,p,4w,o,4w,o,4w,o,4w,o,4w,p,4v,p,4v,p,4w,p,4v,p,4v,p,4v,o,4v,o,4v,p,4u,q,4t,s,4r,t,4q,u,4o,w,4n,x,4m,x,4m,x,4m,x,4m,x,4m,x,4m,x,4n,s,4r,s,4s,r,4s,s,4s,r,4t,q,4u,q,4v,o,4w,n,4x,m,4z,k,51,i,52,h,54,f,56,d,59,9,560');
  heroImage.addEventListener('pointermove', function(event) {
    heroLink.classList.toggle('is-hover', heroTest(event.clientX, event.clientY));
  });
  heroImage.addEventListener('pointerleave', function() {
    heroLink.classList.remove('is-hover');
  });
  // 透明な部分のクリックは無効（キーボード操作は detail が 0 なので対象外）
  heroLink.addEventListener('click', function(event) {
    if (event.detail && !heroTest(event.clientX, event.clientY)) {
      event.preventDefault();
    }
  });
}

// うちのこ紹介のキャラ画像: キャラの上で笑顔に切り替えて跳ねる（形のデータは通常・笑顔で共通）
var charPortrait = document.querySelector('.portrait.cutout');
var charImage = charPortrait && charPortrait.querySelector('img:not(.char-smile)');
if (charImage) {
  var charTest = makeShapeTest(charImage, '200x267:4e5,6,5e,c,58,f,55,i,1,6,4v,t,4r,w,4o,10,4k,14,4g,18,4d,1a,4a,1a,4a,1a,4b,19,4b,19,4b,19,4a,1a,4a,1b,48,1c,48,1c,47,1e,45,1f,44,1g,43,1h,41,1j,3z,1l,3x,1n,3v,1p,3t,1r,3q,1u,3m,1y,3j,21,3g,25,37,2d,34,2h,31,z,2,1i,2z,10,2,1k,2x,z,3,1m,2v,y,4,1o,2u,w,5,1q,2s,u,6,1f,1,d,2r,r,8,1v,2q,p,9,1i,1,e,2o,n,a,1k,1,f,2m,l,c,22,2k,k,d,24,2j,h,e,27,2h,f,g,29,2g,c,h,2c,2f,b,h,2e,2f,9,h,1x,1,i,2e,8,h,1y,4,g,2c,8,i,1y,5,g,2b,4,1,3,g,20,6,h,29,4,1,2,4,2e,6,i,27,3,2,2l,6,j,1z,3,3,3,1,2m,7,j,1y,2x,7,j,1x,30,5,k,1v,32,4,k,1m,6,3,33,3,j,1l,3e,3,j,1l,3d,4,j,1l,3d,4,j,1n,3a,5,i,1k,3d,6,h,1i,3h,5,h,1h,1p,1,1u,3,g,1h,1p,1,1x,1,g,1l,d,1,16,1,1y,1,f,1j,d,4,9,3,s,2,1y,2,e,1i,c,7,6,5,s,1,1y,4,e,1h,a,k,s,1,1w,7,d,1h,9,l,r,2,1z,4,d,1l,5,l,r,2,21,3,d,1j,5,m,r,2,23,1,d,1j,4,o,p,2,25,1,c,1k,2,p,p,2,25,1,c,2c,2,1,l,1,21,1,4,2,3,1,7,2f,k,2,22,6,2,2,6,2g,k,1,24,5,2,2,4,2j,j,2,24,4,2,2,4,2j,j,4,1w,1,5,8,4,2k,i,3,1y,2,3,8,4,2k,h,4,1t,1,4,d,4,2l,g,4,1t,2,4,c,3,2o,e,3,1u,2,4,b,4,2p,d,2,1v,h,3,2r,c,1,1v,3d,1,1,24,3h,22,3j,1y,3n,1w,3q,1u,3p,1c,1,h,3p,1c,2,g,3p,1d,2,e,3q,1d,2,d,3s,1b,4,b,3t,1b,4,9,3v,1d,3,7,3w,1e,2,5,3y,1g,2,1,40,1h,43,1i,41,1j,40,1l,3y,1m,3y,1m,3x,1o,3v,1p,3u,1r,3t,1r,3s,1s,3r,1u,3q,1u,3p,1v,3o,1x,3n,1x,3m,1y,3m,1z,3m,1y,3m,1z,3m,1y,3m,4,1,1t,3n,2,4,1s,3s,1s,3r,1t,3r,1u,3q,1u,3p,1u,3q,1u,3p,1u,3q,1t,3q,1t,3q,1t,3r,w,4,s,3s,m,2,4,9,q,3u,l,e,p,3x,k,e,m,3z,l,e,k,41,k,f,k,41,k,e,l,41,k,e,l,41,k,e,l,40,k,e,n,3z,j,g,m,3z,h,j,k,40,g,l,h,42,g,l,g,42,g,m,g,42,g,m,g,42,f,n,f,42,g,n,f,42,f,o,f,42,f,o,f,41,f,p,f,41,f,p,e,41,f,q,e,41,f,q,e,40,f,r,e,40,f,r,e,3z,f,s,e,3y,g,s,e,3y,g,t,d,3x,g,u,d,3x,g,u,e,3v,g,v,e,3v,g,w,d,3u,h,w,d,3u,g,x,e,3t,g,x,e,3s,g,y,e,3s,g,y,e,3s,g,y,e,3r,g,z,e,3r,g,z,e,3r,f,10,e,3q,g,10,e,3q,f,11,e,3p,f,12,e,3p,f,12,e,3p,e,13,e,3o,f,13,e,3n,f,14,e,3l,g,15,e,3l,g,15,e,3l,f,16,d,3m,f,16,d,3m,g,15,d,3m,i,13,d,3m,j,12,d,3m,j,12,d,3l,k,12,c,3m,j,13,c,3l,k,13,c,3l,j,12,j,3f,j,11,m,3d,j,12,m,36,1,5,j,14,l,34,q,15,k,34,r,16,j,33,s,16,j,33,s,17,h,33,t,17,h,33,n,2,3,19,f,34,n,1e,f,34,m,1e,h,34,l,1e,h,35,j,1f,h,36,i,1e,i,39,f,1e,i,3a,d,1f,i,3b,c,1g,d,3g,a,1g,b,3k,8,1g,d,3l,6,1d,g,3n,3,1d,h,52,i,52,i,51,j,51,j,51,j,51,i,52,i,53,h,54,g,5a,a,1x3');
  var isHappy = false;
  var isHopping = false;
  var restUntil = 0; // 元に戻ってから 0.5 秒は跳ねない
  var setHappy = function(happy) {
    if (happy === isHappy) {
      return;
    }
    if (!happy && isHopping) {
      return; // 跳ねている途中では戻さない
    }
    if (happy && performance.now() < restUntil) {
      return;
    }
    isHappy = happy;
    charPortrait.classList.toggle('is-happy', happy);
    isHopping = happy;
    if (!happy) {
      restUntil = performance.now() + 500;
      setTimeout(check, 520); // 休み明けに再判定
    }
  };

  var lastPoint = null;
  var check = function() {
    setHappy(!!lastPoint && charTest(lastPoint[0], lastPoint[1]));
  };
  ['pointermove', 'pointerdown'].forEach(function(type) {
    charImage.addEventListener(type, function(event) {
      lastPoint = [event.clientX, event.clientY];
      check();
    });
  });
  charImage.addEventListener('pointerleave', function() {
    lastPoint = null;
    check();
  });
  charImage.addEventListener('animationend', function() {
    isHopping = false;
    check();
  });
}
