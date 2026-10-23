/**
 * ChildCare theme front-end behaviour. Vanilla JS, no dependencies.
 *
 * Motion: scroll reveals, hero intro, testimonial deck, scroll-boosted ticker,
 * odometer counters, scroll-linked badge rotation, parallax images and optional
 * smooth scrolling. Everything is skipped when the visitor prefers reduced motion.
 *
 * Every feature is initialised per element so it also works inside the
 * Elementor preview when widgets are re-rendered.
 */
( function () {
	'use strict';

	var doc = document;
	var root = doc.documentElement;
	var reduceMotion = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var settings = window.childcareSettings || {};

	root.classList.add( 'cc-js' );

	function each( scope, selector, fn ) {
		Array.prototype.forEach.call( ( scope || doc ).querySelectorAll( selector ), fn );
	}

	function once( el, key ) {
		if ( el[ '__cc' + key ] ) {
			return false;
		}
		el[ '__cc' + key ] = true;
		return true;
	}

	/* Shared scroll loop: one rAF callback list for every scroll-linked effect. */
	var scrollFns = [];
	var scrollTicking = false;
	function onScrollFrame() {
		scrollTicking = false;
		for ( var i = 0; i < scrollFns.length; i++ ) {
			scrollFns[ i ]();
		}
	}
	function requestScrollFrame() {
		if ( ! scrollTicking ) {
			scrollTicking = true;
			requestAnimationFrame( onScrollFrame );
		}
	}
	window.addEventListener( 'scroll', requestScrollFrame, { passive: true } );
	window.addEventListener( 'resize', requestScrollFrame );

	/* Off-canvas menu ---------------------------------------------------- */
	function initOffcanvas() {
		var panel = doc.getElementById( 'cc-offcanvas' );
		if ( ! panel || ! once( panel, 'oc' ) ) {
			return;
		}
		var toggles = doc.querySelectorAll( '[data-cc-offcanvas]' );
		var lastFocus = null;

		function setOpen( open ) {
			panel.classList.toggle( 'is-open', open );
			panel.setAttribute( 'aria-hidden', open ? 'false' : 'true' );
			Array.prototype.forEach.call( toggles, function ( t ) {
				t.setAttribute( 'aria-expanded', open ? 'true' : 'false' );
			} );
			doc.body.style.overflow = open ? 'hidden' : '';
			if ( open ) {
				lastFocus = doc.activeElement;
				var first = panel.querySelector( 'a, button' );
				if ( first ) {
					first.focus();
				}
			} else if ( lastFocus ) {
				lastFocus.focus();
			}
		}

		Array.prototype.forEach.call( toggles, function ( t ) {
			t.addEventListener( 'click', function () {
				setOpen( ! panel.classList.contains( 'is-open' ) );
			} );
		} );

		each( panel, '.menu-item-has-children > a', function ( link ) {
			link.addEventListener( 'click', function ( e ) {
				var li = link.parentNode;
				if ( ! li.classList.contains( 'is-open' ) ) {
					e.preventDefault();
					li.classList.add( 'is-open' );
				}
			} );
		} );

		doc.addEventListener( 'keydown', function ( e ) {
			if ( 'Escape' === e.key && panel.classList.contains( 'is-open' ) ) {
				setOpen( false );
			}
		} );
	}

	/* Search overlay ----------------------------------------------------- */
	function initSearch() {
		var overlay = doc.getElementById( 'cc-search' );
		if ( ! overlay || ! once( overlay, 'search' ) ) {
			return;
		}
		function setOpen( open ) {
			overlay.hidden = ! open;
			doc.body.style.overflow = open ? 'hidden' : '';
			if ( open ) {
				var input = overlay.querySelector( 'input[type="search"]' );
				if ( input ) {
					input.focus();
				}
			}
		}
		each( doc, '[data-cc-search]', function ( btn ) {
			btn.addEventListener( 'click', function () {
				setOpen( overlay.hidden );
			} );
		} );
		overlay.addEventListener( 'click', function ( e ) {
			if ( e.target === overlay ) {
				setOpen( false );
			}
		} );
		doc.addEventListener( 'keydown', function ( e ) {
			if ( 'Escape' === e.key && ! overlay.hidden ) {
				setOpen( false );
			}
		} );
	}

	/* Ticker: JS-driven loop that speeds up while the page scrolls -------- */
	function initMarquee( scope ) {
		each( scope, '.cc-marquee__bar', function ( bar ) {
			if ( ! once( bar, 'mq' ) ) {
				return;
			}
			var track = bar.querySelector( '.cc-marquee__track' );
			if ( ! track ) {
				return;
			}
			var guard = 0;
			while ( track.scrollWidth < bar.clientWidth && guard < 6 && track.children.length ) {
				Array.prototype.slice.call( track.children ).forEach( function ( item ) {
					track.appendChild( item.cloneNode( true ) );
				} );
				guard++;
			}
			var clone = track.cloneNode( true );
			clone.setAttribute( 'aria-hidden', 'true' );
			bar.appendChild( clone );

			if ( reduceMotion ) {
				return;
			}
			bar.classList.add( 'is-js' );
			var tracks = [ track, clone ];
			var x = 0;
			var base = 45; // px per second.
			var boost = 0;
			var lastY = window.pageYOffset;
			var lastT = performance.now();
			var hover = false;
			bar.addEventListener( 'mouseenter', function () {
				hover = true;
			} );
			bar.addEventListener( 'mouseleave', function () {
				hover = false;
			} );
			scrollFns.push( function () {
				var y = window.pageYOffset;
				boost = Math.min( 900, boost + Math.abs( y - lastY ) * 4 );
				lastY = y;
			} );
			function tick( t ) {
				var dt = Math.min( 0.05, ( t - lastT ) / 1000 );
				lastT = t;
				boost *= 0.92;
				var w = track.offsetWidth;
				if ( ! hover && w ) {
					x -= ( base + boost ) * dt;
					if ( -x >= w ) {
						x += w;
					}
					tracks[ 0 ].style.transform = tracks[ 1 ].style.transform = 'translate3d(' + x + 'px,0,0)';
				}
				requestAnimationFrame( tick );
			}
			requestAnimationFrame( tick );
		} );
	}

	/* Testimonial deck --------------------------------------------------- */
	function initQuotes( scope ) {
		each( scope, '.cc-quotes', function ( wrap ) {
			if ( ! once( wrap, 'q' ) ) {
				return;
			}
			var items = Array.prototype.slice.call( wrap.querySelectorAll( '.cc-quote' ) );
			if ( ! items.length ) {
				return;
			}
			var index = 0;
			function layout() {
				items.forEach( function ( item, i ) {
					var pos = ( i - index + items.length ) % items.length;
					item.setAttribute( 'data-pos', pos > 2 ? 'hidden' : String( pos ) );
					item.classList.toggle( 'is-active', 0 === pos );
					item.setAttribute( 'aria-hidden', 0 === pos ? 'false' : 'true' );
				} );
			}
			layout();
			wrap.classList.add( 'is-ready' );
			if ( items.length < 2 || reduceMotion ) {
				return;
			}
			var delay = parseInt( wrap.getAttribute( 'data-interval' ), 10 ) || 4200;
			function next() {
				var leaving = items[ index ];
				index = ( index + 1 ) % items.length;
				layout();
				leaving.setAttribute( 'data-pos', 'leave' );
				setTimeout( function () {
					layout();
				}, 720 );
			}
			var timer = setInterval( next, delay );
			wrap.addEventListener( 'mouseenter', function () {
				clearInterval( timer );
			} );
			wrap.addEventListener( 'mouseleave', function () {
				clearInterval( timer );
				timer = setInterval( next, delay );
			} );
		} );
	}

	/* Odometer counters: every digit is a rolling column ----------------- */
	function buildOdometer( el ) {
		var node = null;
		for ( var i = 0; i < el.childNodes.length; i++ ) {
			if ( 3 === el.childNodes[ i ].nodeType && /\d/.test( el.childNodes[ i ].nodeValue ) ) {
				node = el.childNodes[ i ];
				break;
			}
		}
		if ( ! node ) {
			return null;
		}
		var text = node.nodeValue.trim();
		var wrap = doc.createElement( 'span' );
		wrap.className = 'cc-odo';
		wrap.setAttribute( 'aria-label', text );
		var cols = [];
		text.split( '' ).forEach( function ( ch, i ) {
			if ( ! /\d/.test( ch ) ) {
				var s = doc.createElement( 'span' );
				s.textContent = ch;
				wrap.appendChild( s );
				return;
			}
			var col = doc.createElement( 'span' );
			col.className = 'cc-odo__col';
			col.setAttribute( 'aria-hidden', 'true' );
			col.style.setProperty( '--cc-delay', ( i * 0.12 ) + 's' );
			// Two full turns before landing on the target digit.
			var html = '';
			for ( var n = 0; n < 20; n++ ) {
				html += '<span>' + ( n % 10 ) + '</span>';
			}
			col.innerHTML = html + '<span>' + ch + '</span>';
			wrap.appendChild( col );
			cols.push( col );
		} );
		el.replaceChild( wrap, node );
		return function () {
			cols.forEach( function ( col ) {
				col.style.transform = 'translateY(-' + ( col.children.length - 1 ) * 0.95 + 'em)';
			} );
		};
	}

	/* Sliders (team + posts): native scroll-snap, buttons scroll by one card */
	function initSliders( scope ) {
		each( scope, '.cc-slider', function ( slider ) {
			if ( ! once( slider, 'sl' ) ) {
				return;
			}
			var track = slider.querySelector( '.cc-slider__track, .wp-block-post-template' );
			if ( ! track ) {
				return;
			}
			var prev = slider.querySelector( '.cc-slider-prev' );
			var next = slider.querySelector( '.cc-slider-next' );
			var centered = slider.classList.contains( 'cc-slider--center' );
			var ticking = false;

			function cards() {
				return track.children;
			}

			function step() {
				var c = cards();
				if ( c.length < 2 ) {
					return track.clientWidth;
				}
				return c[ 1 ].offsetLeft - c[ 0 ].offsetLeft;
			}

			function update() {
				ticking = false;
				var max = track.scrollWidth - track.clientWidth - 2;
				if ( prev ) {
					prev.disabled = track.scrollLeft <= 2;
				}
				if ( next ) {
					next.disabled = track.scrollLeft >= max;
				}
				if ( ! centered ) {
					return;
				}
				var mid = track.scrollLeft + track.clientWidth / 2;
				var best = null;
				var bestDist = Infinity;
				Array.prototype.forEach.call( cards(), function ( card ) {
					var dist = Math.abs( card.offsetLeft + card.offsetWidth / 2 - mid );
					if ( dist < bestDist ) {
						bestDist = dist;
						best = card;
					}
				} );
				Array.prototype.forEach.call( cards(), function ( card ) {
					var target = card.classList.contains( 'cc-team-card' ) ? card : card.querySelector( '.cc-team-card' ) || card;
					target.classList.toggle( 'is-active', card === best );
				} );
			}

			function onScroll() {
				if ( ! ticking ) {
					ticking = true;
					requestAnimationFrame( update );
				}
			}

			if ( prev ) {
				prev.addEventListener( 'click', function () {
					track.scrollBy( { left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' } );
				} );
			}
			if ( next ) {
				next.addEventListener( 'click', function () {
					track.scrollBy( { left: step(), behavior: reduceMotion ? 'auto' : 'smooth' } );
				} );
			}
			track.addEventListener( 'scroll', onScroll, { passive: true } );
			window.addEventListener( 'resize', onScroll );

			if ( centered ) {
				var c = cards();
				var startIndex = Math.floor( ( c.length - 1 ) / 2 );
				if ( c[ startIndex ] ) {
					var prevBehavior = track.style.scrollBehavior;
					track.style.scrollBehavior = 'auto';
					track.scrollLeft = c[ startIndex ].offsetLeft + c[ startIndex ].offsetWidth / 2 - track.clientWidth / 2;
					track.style.scrollBehavior = prevBehavior;
				}
			}
			slider.classList.add( 'is-ready' );
			update();
		} );
	}

	/* Scroll reveals ---------------------------------------------------- */
	// Elements that fade up as they enter the viewport. Children of "stagger" groups get increasing delays.
	var REVEAL = [
		'.cc-sec:not(.cc-hero) h1', '.cc-sec:not(.cc-hero) h2', '.cc-section-title', '.cc-sec:not(.cc-hero) .wp-block-buttons', '.cc-sec:not(.cc-hero) .cc-buttons',
		'.cc-about__title', '.cc-services__text', '.cc-phero__text', '.cc-stats', '.cc-slider', '.cc-faq__item',
		'.cc-cta__card', '.cc-cta__phone', '.cc-cinfo__item', '.cc-form', '.cc-mission__content', '.cc-prose > *',
		'.cc-footer__links > *', '.cc-footer__aside', '.cc-single-aside', '.cc-entry--article > *'
	].join( ',' );
	var STAGGER = '.cc-features__grid, .cc-svc-grid, .cc-doc-grid, .cc-locations, .cc-archive-grid';
	var CLIP = '.cc-phero__img, .cc-detail__hero, .cc-single-thumb';

	function initReveals( scope ) {
		if ( reduceMotion || ! ( 'IntersectionObserver' in window ) ) {
			return;
		}
		var io = new IntersectionObserver( function ( entries ) {
			entries.forEach( function ( entry ) {
				if ( entry.isIntersecting ) {
					entry.target.classList.add( 'is-visible' );
					io.unobserve( entry.target );
				}
			} );
		}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' } );

		function add( el, extra, delay ) {
			if ( ! once( el, 'rv' ) || el.closest( '.cc-hero' ) || el.closest( '.cc-reveal' ) ) {
				return;
			}
			el.classList.add( 'cc-reveal' );
			if ( extra ) {
				el.classList.add( extra );
			}
			if ( delay ) {
				el.style.setProperty( '--cc-delay', delay + 's' );
			}
			io.observe( el );
		}

		each( scope, STAGGER, function ( grid ) {
			Array.prototype.forEach.call( grid.children, function ( child, i ) {
				add( child, '', ( i % 3 ) * 0.12 );
			} );
		} );
		each( scope, CLIP, function ( el ) {
			add( el, 'cc-reveal--clip' );
		} );
		each( scope, REVEAL, function ( el ) {
			add( el );
		} );
		each( scope, '[data-cc-reveal]', function ( el ) {
			add( el );
		} );
	}

	/* Hero intro: staggered fade-up on load ------------------------------ */
	function initHeroIntro( scope ) {
		each( scope, '.cc-hero', function ( hero ) {
			if ( ! once( hero, 'intro' ) || reduceMotion ) {
				return;
			}
			var parts = hero.querySelectorAll( '.cc-hero__title, .cc-hero__title-row, .cc-hero__text, .cc-hero .wp-block-buttons, .cc-hero .cc-buttons, .cc-quotes, .cc-video-card, .cc-scroll-badge' );
			Array.prototype.forEach.call( parts, function ( el, i ) {
				el.classList.add( 'cc-reveal' );
				el.style.setProperty( '--cc-delay', ( 0.1 + i * 0.1 ) + 's' );
			} );
			var media = hero.querySelector( '.cc-hero__media' );
			if ( media ) {
				media.classList.add( 'cc-reveal', 'cc-reveal--clip' );
			}
			requestAnimationFrame( function () {
				requestAnimationFrame( function () {
					each( hero, '.cc-reveal', function ( el ) {
						el.classList.add( 'is-visible' );
					} );
					if ( media ) {
						media.classList.add( 'is-visible' );
					}
				} );
			} );
		} );
	}

	/* Counters start when visible --------------------------------------- */
	function initCounters( scope ) {
		var list = [];
		each( scope, '.cc-stat__number', function ( el ) {
			if ( ! once( el, 'cnt' ) ) {
				return;
			}
			var run = reduceMotion ? null : buildOdometer( el );
			if ( run ) {
				list.push( { el: el, run: run } );
			}
		} );
		if ( ! list.length ) {
			return;
		}
		if ( ! ( 'IntersectionObserver' in window ) ) {
			list.forEach( function ( item ) {
				item.run();
			} );
			return;
		}
		var io = new IntersectionObserver( function ( entries ) {
			entries.forEach( function ( entry ) {
				if ( entry.isIntersecting ) {
					io.unobserve( entry.target );
					list.forEach( function ( item ) {
						if ( item.el === entry.target ) {
							setTimeout( item.run, 150 );
						}
					} );
				}
			} );
		}, { threshold: 0.4 } );
		list.forEach( function ( item ) {
			io.observe( item.el );
		} );
	}

	/* Scroll-linked effects: badge rotation + parallax ------------------- */
	function initScrollEffects( scope ) {
		if ( reduceMotion ) {
			return;
		}
		each( scope, '.cc-scroll-badge', function ( badge ) {
			if ( ! once( badge, 'badge' ) ) {
				return;
			}
			var svg = badge.querySelector( 'svg' );
			if ( ! svg ) {
				return;
			}
			badge.classList.add( 'is-js' );
			var angle = 0;
			var last = performance.now();
			var lastY = window.pageYOffset;
			// Slow idle spin plus extra rotation proportional to scroll distance.
			( function spin( t ) {
				var y = window.pageYOffset;
				angle -= ( t - last ) * 0.012 + Math.abs( y - lastY ) * 0.25;
				last = t;
				lastY = y;
				svg.style.transform = 'rotate(' + angle + 'deg)';
				requestAnimationFrame( spin );
			}( last ) );
		} );

		var layers = [];
		each( scope, '.cc-band__img, .cc-mission__bg, .cc-phero__img, .cc-parallax', function ( el ) {
			if ( ! once( el, 'px' ) ) {
				return;
			}
			var img = el.querySelector( 'img' );
			if ( img ) {
				el.classList.add( 'cc-parallax' );
				layers.push( { el: el, img: img } );
			}
		} );
		if ( ! layers.length ) {
			return;
		}
		function update() {
			var vh = window.innerHeight;
			layers.forEach( function ( l ) {
				var r = l.el.getBoundingClientRect();
				if ( r.bottom < -100 || r.top > vh + 100 ) {
					return;
				}
				// Progress -1 (below) → 1 (above); image (124% tall) moves within its frame without exposing edges.
				var p = ( ( r.top + r.height / 2 ) - vh / 2 ) / ( vh / 2 + r.height / 2 );
				p = Math.max( -1, Math.min( 1, p ) );
				l.img.style.transform = 'translate3d(0,' + ( -9.7 + p * 9.5 ).toFixed( 2 ) + '%,0)';
			} );
		}
		scrollFns.push( update );
		update();
	}

	/* Smooth scrolling: eases mouse-wheel input only; touch and keyboard stay native. */
	function initSmoothScroll() {
		if ( reduceMotion || ! settings.smoothScroll || doc.body.classList.contains( 'elementor-editor-active' ) || window.self !== window.top ) {
			return;
		}
		root.classList.add( 'cc-smooth' );
		var target = window.pageYOffset;
		var current = target;
		var running = false;

		function maxScroll() {
			return Math.max( 0, root.scrollHeight - window.innerHeight );
		}

		function frame() {
			current += ( target - current ) * 0.1;
			if ( Math.abs( target - current ) < 0.5 ) {
				current = target;
				running = false;
			}
			window.scrollTo( { top: current, left: 0, behavior: 'instant' } );
			if ( running ) {
				requestAnimationFrame( frame );
			}
		}

		window.addEventListener( 'wheel', function ( e ) {
			if ( e.ctrlKey || e.defaultPrevented ) {
				return;
			}
			// Let nested scrollable areas (sliders, textareas, menus) scroll natively.
			for ( var n = e.target; n && n !== doc.body; n = n.parentNode ) {
				if ( n.nodeType === 1 && n.scrollHeight > n.clientHeight + 2 && /(auto|scroll)/.test( getComputedStyle( n ).overflowY ) ) {
					return;
				}
			}
			if ( doc.body.style.overflow === 'hidden' ) {
				return;
			}
			e.preventDefault();
			var delta = e.deltaY * ( 1 === e.deltaMode ? 40 : 1 );
			if ( ! running ) {
				current = window.pageYOffset;
				target = current;
			}
			target = Math.max( 0, Math.min( maxScroll(), target + delta ) );
			if ( ! running ) {
				running = true;
				requestAnimationFrame( frame );
			}
		}, { passive: false } );

		// Keep in sync with keyboard, scrollbar and anchor jumps.
		window.addEventListener( 'scroll', function () {
			if ( ! running ) {
				target = current = window.pageYOffset;
			}
		}, { passive: true } );

		// Smooth in-page anchor links.
		doc.addEventListener( 'click', function ( e ) {
			var a = e.target.closest && e.target.closest( 'a[href*="#"]' );
			if ( ! a || a.origin !== location.origin || a.pathname !== location.pathname || ! a.hash || a.hash.length < 2 ) {
				return;
			}
			var dest = doc.getElementById( decodeURIComponent( a.hash.slice( 1 ) ) );
			if ( ! dest ) {
				return;
			}
			e.preventDefault();
			current = window.pageYOffset;
			target = Math.min( maxScroll(), dest.getBoundingClientRect().top + window.pageYOffset );
			if ( ! running ) {
				running = true;
				requestAnimationFrame( frame );
			}
			history.pushState( null, '', a.hash );
		} );
	}

	/* Multi-step appointment form --------------------------------------- */
	function initSteps( scope ) {
		each( scope, '[data-cc-steps]', function ( form ) {
			if ( ! once( form, 'steps' ) ) {
				return;
			}
			var panes = form.querySelectorAll( '.cc-step' );
			var navItems = form.querySelectorAll( '.cc-steps__item' );
			var current = 0;
			function show( i ) {
				current = i;
				Array.prototype.forEach.call( panes, function ( p, n ) {
					p.hidden = n !== i;
				} );
				Array.prototype.forEach.call( navItems, function ( item, n ) {
					item.classList.toggle( 'is-current', n === i );
					item.classList.toggle( 'is-done', n < i );
				} );
			}
			function valid( pane ) {
				var fields = pane.querySelectorAll( 'input, select, textarea' );
				for ( var n = 0; n < fields.length; n++ ) {
					if ( fields[ n ].checkValidity && ! fields[ n ].checkValidity() ) {
						fields[ n ].reportValidity();
						return false;
					}
				}
				return true;
			}
			form.addEventListener( 'click', function ( e ) {
				var btn = e.target.closest( '[data-cc-step]' );
				if ( ! btn ) {
					return;
				}
				e.preventDefault();
				if ( 'next' === btn.getAttribute( 'data-cc-step' ) ) {
					if ( valid( panes[ current ] ) && current < panes.length - 1 ) {
						show( current + 1 );
					}
				} else if ( current > 0 ) {
					show( current - 1 );
				}
			} );
			// Jump straight to the step with the first invalid field when submitting.
			form.addEventListener( 'invalid', function ( e ) {
				var pane = e.target.closest( '.cc-step' );
				var idx = Array.prototype.indexOf.call( panes, pane );
				if ( idx > -1 && idx !== current ) {
					show( idx );
				}
			}, true );
		} );
	}

	/* Article table of contents ----------------------------------------- */
	function initToc() {
		var toc = doc.querySelector( '[data-cc-toc]' );
		var article = doc.querySelector( '.cc-entry--article' );
		if ( ! toc || ! article || ! once( toc, 'toc' ) ) {
			return;
		}
		var heads = article.querySelectorAll( 'h2, h3' );
		if ( ! heads.length ) {
			toc.closest( '.cc-single-aside__block' ).hidden = true;
			return;
		}
		var links = [];
		Array.prototype.forEach.call( heads, function ( h, i ) {
			if ( ! h.id ) {
				h.id = 'section-' + ( i + 1 );
			}
			var li = doc.createElement( 'li' );
			var a = doc.createElement( 'a' );
			a.href = '#' + h.id;
			a.textContent = h.textContent;
			if ( 'H3' === h.tagName ) {
				li.style.paddingLeft = '14px';
			}
			li.appendChild( a );
			toc.appendChild( li );
			links.push( { a: a, h: h } );
		} );
		scrollFns.push( function () {
			var active = links[ 0 ];
			links.forEach( function ( l ) {
				if ( l.h.getBoundingClientRect().top < 160 ) {
					active = l;
				}
			} );
			links.forEach( function ( l ) {
				l.a.classList.toggle( 'is-active', l === active );
			} );
		} );
	}

	function initScope( scope ) {
		initHeroIntro( scope );
		initMarquee( scope );
		initQuotes( scope );
		initSliders( scope );
		initCounters( scope );
		initScrollEffects( scope );
		initSteps( scope );
		initReveals( scope );
	}

	/* Footer wordmark: shrink the giant site name until it fits its column. */
	function initWordmark() {
		var el = doc.querySelector( '.cc-footer__wordmark' );
		if ( ! el ) {
			return;
		}
		function fit() {
			el.style.fontSize = '';
			var avail = el.clientWidth - parseFloat( getComputedStyle( el ).paddingRight ) - parseFloat( getComputedStyle( el ).paddingLeft );
			if ( el.scrollWidth > el.clientWidth && avail > 0 ) {
				var size = parseFloat( getComputedStyle( el ).fontSize );
				var text = el.scrollWidth - ( el.clientWidth - avail );
				el.style.fontSize = Math.floor( size * avail / text ) + 'px';
			}
		}
		fit();
		if ( doc.fonts && doc.fonts.ready ) {
			doc.fonts.ready.then( fit );
		}
		var t;
		window.addEventListener( 'resize', function () {
			clearTimeout( t );
			t = setTimeout( fit, 150 );
		} );
	}

	function boot() {
		initOffcanvas();
		initSearch();
		initScope( doc );
		initToc();
		initWordmark();
		initSmoothScroll();
		requestScrollFrame();
	}

	if ( 'loading' === doc.readyState ) {
		doc.addEventListener( 'DOMContentLoaded', boot );
	} else {
		boot();
	}

	// Re-run on widgets rendered inside the Elementor editor preview.
	window.addEventListener( 'elementor/frontend/init', function () {
		if ( window.elementorFrontend && window.elementorFrontend.hooks ) {
			window.elementorFrontend.hooks.addAction( 'frontend/element_ready/global', function ( $scope ) {
				initScope( $scope && $scope[ 0 ] ? $scope[ 0 ] : doc );
			} );
		}
	} );

	window.ChildCare = { init: initScope };
}() );
