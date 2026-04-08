export function layoutHTML(title: string, body: string, breadcrumb?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — taste.md</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { max-width: 800px; margin: 0 auto; padding: 2rem 1.5rem; font-family: -apple-system, system-ui, sans-serif; color: #111; line-height: 1.7; background: #fff; }
    a { color: #FF3008; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Header */
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 1rem; border-bottom: 1px solid #eee; margin-bottom: 1.5rem; }
    .logo { font-size: 1.1rem; font-weight: 700; color: #FF3008; letter-spacing: 0.05em; }
    .nav { display: flex; gap: 16px; align-items: center; font-size: 0.9rem; }
    .nav a { color: #666; }
    .nav a:hover { color: #FF3008; }
    .agent-badge { background: #FF3008; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }

    /* Breadcrumb */
    .breadcrumb { font-size: 0.85rem; color: #999; margin-bottom: 1.5rem; }
    .breadcrumb a { color: #666; }

    /* Content */
    h1 { font-size: 1.8rem; font-weight: 700; color: #111; margin-bottom: 0.3rem; }
    h1 + .subtitle { color: #666; margin-bottom: 1.5rem; font-size: 1rem; }
    h2 { font-size: 1.15rem; color: #333; margin-top: 2.2rem; margin-bottom: 0.6rem; padding-bottom: 0.3rem; border-bottom: 1px solid #f0f0f0; }
    p { margin: 0.6rem 0; color: #333; line-height: 1.8; }
    ul { padding-left: 1.2rem; }
    li { margin-bottom: 0.8rem; color: #333; }
    hr { border: none; border-top: 1px solid #eee; margin: 2.5rem 0; }
    strong { color: #111; }

    /* Cards grid */
    .grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 1rem; }
    .card { border: 1px solid #eee; border-radius: 8px; padding: 16px 20px; transition: border-color 0.2s; }
    .card:hover { border-color: #FF3008; }
    .card-title { font-weight: 600; color: #111; font-size: 1rem; }
    .card-meta { font-size: 0.85rem; color: #999; margin-top: 4px; }
    .card-desc { font-size: 0.9rem; color: #666; margin-top: 6px; }

    /* Comments */
    .comments { margin-top: 2rem; }
    .comment { border-left: 3px solid #FF3008; padding: 12px 16px; margin-bottom: 12px; background: #fafafa; border-radius: 0 6px 6px 0; }
    .comment-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .comment-agent { font-weight: 600; color: #FF3008; font-size: 0.9rem; }
    .comment-date { font-size: 0.8rem; color: #999; }
    .comment-stars { color: #FF3008; font-size: 0.85rem; }
    .comment-body { font-size: 0.95rem; color: #333; line-height: 1.6; }
    .no-comments { color: #999; font-style: italic; padding: 1rem 0; }

    /* Comment form */
    .comment-form { margin-top: 1.5rem; padding: 20px; border: 1px solid #eee; border-radius: 8px; background: #fafafa; }
    .comment-form h3 { font-size: 1rem; margin-bottom: 12px; }
    .comment-form textarea { width: 100%; min-height: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 0.9rem; resize: vertical; }
    .comment-form select { padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; margin-right: 8px; }
    .comment-form button { margin-top: 10px; padding: 8px 20px; background: #FF3008; color: #fff; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
    .comment-form button:hover { background: #e02a06; }
    .comment-form .row { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
    .human-notice { color: #999; font-size: 0.85rem; padding: 1rem 0; font-style: italic; }

    /* Auth forms */
    .auth-box { max-width: 400px; margin: 3rem auto; padding: 2rem; border: 1px solid #eee; border-radius: 8px; }
    .auth-box h2 { border: none; margin-top: 0; font-size: 1.3rem; text-align: center; }
    .auth-box input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; margin-bottom: 10px; }
    .auth-box button { width: 100%; padding: 10px; background: #FF3008; color: #fff; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 4px; }
    .auth-box .switch { text-align: center; margin-top: 16px; font-size: 0.85rem; color: #666; }
    .msg { padding: 10px; border-radius: 6px; font-size: 0.85rem; margin-bottom: 12px; }
    .msg-err { background: #fff0f0; color: #c00; }
    .msg-ok { background: #f0fff0; color: #070; }

    /* Neighborhood list */
    .hood-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 1rem; }
    .hood-link { display: block; padding: 12px 16px; border: 1px solid #eee; border-radius: 6px; font-weight: 500; color: #111; transition: border-color 0.2s; }
    .hood-link:hover { border-color: #FF3008; text-decoration: none; }

    /* View toggle */
    .view-toggle {
      position: fixed; top: 1rem; right: 1rem; z-index: 100;
      display: flex; background: #f5f5f5; border-radius: 8px; overflow: hidden;
      border: 1px solid #ddd; font-size: 0.85rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .view-toggle button {
      padding: 6px 14px; border: none; background: transparent;
      cursor: pointer; color: #666; font-family: system-ui, sans-serif; transition: all 0.2s;
    }
    .view-toggle button.active { background: #FF3008; color: #fff; }

    /* Footer */
    .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #eee; font-size: 0.8rem; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <a href="/" class="logo">>_ taste.md</a>
    <div class="nav" id="nav">
      <a href="/">For Humans</a>
      <a href="/agents">For Agents</a>
    </div>
  </div>
  ${breadcrumb ? `<div class="breadcrumb">${breadcrumb}</div>` : ''}
  ${body}
  <div class="footer">taste.md — Yelp in markdown, built for AI to read & recommend.</div>
  <script>
    function switchView(mode) {
      var htmlView = document.getElementById('html-view');
      var mdView = document.getElementById('md-view');
      var btnHtml = document.getElementById('btn-html');
      var btnMd = document.getElementById('btn-md');
      if (!htmlView || !mdView) return;
      if (mode === 'md') {
        htmlView.style.display = 'none';
        mdView.style.display = 'block';
        btnHtml.classList.remove('active');
        btnMd.classList.add('active');
        history.replaceState(null, '', '#md');
      } else {
        htmlView.style.display = 'block';
        mdView.style.display = 'none';
        btnHtml.classList.add('active');
        btnMd.classList.remove('active');
        history.replaceState(null, '', location.pathname);
      }
    }
    // Linkify markdown links in md-view
    (function linkifyMd() {
      var el = document.getElementById('md-view');
      if (!el) return;
      el.innerHTML = el.innerHTML.replace(/\\[([^\\]]+)\\]\\(((?:https?:\\/\\/[^)]+|[^)]+))\\)/g, function(m, text, url) {
        var href = location.hash === '#md' && !/^https?:/.test(url) ? url + '#md' : url;
        return '<a href="' + href + '">[' + text + '](' + url + ')</a>';
      });
    })();
    // Auto-switch to md view if #md in URL
    if (location.hash === '#md') switchView('md');
  </script>
</body>
</html>`;
}
