(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/jon/jupyter/notebook/node_modules/marked/lib/marked.js":[function(require,module,exports){
(function (global){
/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */

;(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
  ('def', '\\n+(?=' + block.def.source + ')')
  ();

block.blockquote = replace(block.blockquote)
  ('def', block.def)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

block.html = replace(block.html)
  ('comment', /<!--[\s\S]*?-->/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/,
  heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || marked.defaults;
  this.rules = block.normal;

  if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top, bq) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = this.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this.tokens.push({
        type: 'code',
        text: !this.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = this.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'code',
        lang: cap[2],
        text: cap[3] || ''
      });
      continue;
    }

    // heading
    if (cap = this.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = this.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this.token(cap, top, true);

      this.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this.rules.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this.options.smartLists && i !== l - 1) {
          b = block.bullet.exec(cap[i + 1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item.charAt(item.length - 1) === '\n';
          if (!loose) loose = next;
        }

        this.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this.token(item, false, bq);

        this.tokens.push({
          type: 'list_item_end'
        });
      }

      this.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: this.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: !this.options.sanitizer
          && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
        text: cap[0]
      });
      continue;
    }

    // def
    if ((!bq && top) && (cap = this.rules.def.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'paragraph',
        text: cap[1].charAt(cap[1].length - 1) === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options) {
  this.options = options || marked.defaults;
  this.links = links;
  this.rules = inline.normal;
  this.renderer = this.options.renderer || new Renderer;
  this.renderer.options = this.options;

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var out = ''
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1].charAt(6) === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += this.renderer.link(href, null, text);
      continue;
    }

    // url (gfm)
    if (!this.inLink && (cap = this.rules.url.exec(src))) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += this.renderer.link(href, null, text);
      continue;
    }

    // tag
    if (cap = this.rules.tag.exec(src)) {
      if (!this.inLink && /^<a /i.test(cap[0])) {
        this.inLink = true;
      } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
        this.inLink = false;
      }
      src = src.substring(cap[0].length);
      out += this.options.sanitize
        ? this.options.sanitizer
          ? this.options.sanitizer(cap[0])
          : escape(cap[0])
        : cap[0]
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      this.inLink = true;
      out += this.outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      this.inLink = false;
      continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0].charAt(0);
        src = cap[0].substring(1) + src;
        continue;
      }
      this.inLink = true;
      out += this.outputLink(cap, link);
      this.inLink = false;
      continue;
    }

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.strong(this.output(cap[2] || cap[1]));
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.em(this.output(cap[2] || cap[1]));
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.codespan(escape(cap[2], true));
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.br();
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.del(this.output(cap[1]));
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.text(escape(this.smartypants(cap[0])));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  var href = escape(link.href)
    , title = link.title ? escape(link.title) : null;

  return cap[0].charAt(0) !== '!'
    ? this.renderer.link(href, title, this.output(cap[1]))
    : this.renderer.image(href, title, escape(cap[1]));
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) return text;
  return text
    // em-dashes
    .replace(/---/g, '\u2014')
    // en-dashes
    .replace(/--/g, '\u2013')
    // opening singles
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
    // closing singles & apostrophes
    .replace(/'/g, '\u2019')
    // opening doubles
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
    // closing doubles
    .replace(/"/g, '\u201d')
    // ellipses
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  if (!this.options.mangle) return text;
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

/**
 * Renderer
 */

function Renderer(options) {
  this.options = options || {};
}

Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

Renderer.prototype.blockquote = function(quote) {
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

Renderer.prototype.html = function(html) {
  return html;
};

Renderer.prototype.heading = function(text, level, raw) {
  return '<h'
    + level
    + ' id="'
    + this.options.headerPrefix
    + raw.toLowerCase().replace(/[^\w]+/g, '-')
    + '">'
    + text
    + '</h'
    + level
    + '>\n';
};

Renderer.prototype.hr = function() {
  return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};

Renderer.prototype.list = function(body, ordered) {
  var type = ordered ? 'ol' : 'ul';
  return '<' + type + '>\n' + body + '</' + type + '>\n';
};

Renderer.prototype.listitem = function(text) {
  return '<li>' + text + '</li>\n';
};

Renderer.prototype.paragraph = function(text) {
  return '<p>' + text + '</p>\n';
};

Renderer.prototype.table = function(header, body) {
  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.tablerow = function(content) {
  return '<tr>\n' + content + '</tr>\n';
};

Renderer.prototype.tablecell = function(content, flags) {
  var type = flags.header ? 'th' : 'td';
  var tag = flags.align
    ? '<' + type + ' style="text-align:' + flags.align + '">'
    : '<' + type + '>';
  return tag + content + '</' + type + '>\n';
};

// span level renderer
Renderer.prototype.strong = function(text) {
  return '<strong>' + text + '</strong>';
};

Renderer.prototype.em = function(text) {
  return '<em>' + text + '</em>';
};

Renderer.prototype.codespan = function(text) {
  return '<code>' + text + '</code>';
};

Renderer.prototype.br = function() {
  return this.options.xhtml ? '<br/>' : '<br>';
};

Renderer.prototype.del = function(text) {
  return '<del>' + text + '</del>';
};

Renderer.prototype.link = function(href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
      return '';
    }
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '>' + text + '</a>';
  return out;
};

Renderer.prototype.image = function(href, title, text) {
  var out = '<img src="' + href + '" alt="' + text + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += this.options.xhtml ? '/>' : '>';
  return out;
};

Renderer.prototype.text = function(text) {
  return text;
};

/**
 * Parsing & Compiling
 */

function Parser(options) {
  this.tokens = [];
  this.token = null;
  this.options = options || marked.defaults;
  this.options.renderer = this.options.renderer || new Renderer;
  this.renderer = this.options.renderer;
  this.renderer.options = this.options;
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options, renderer) {
  var parser = new Parser(options, renderer);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  this.inline = new InlineLexer(src.links, this.options, this.renderer);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length - 1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return this.renderer.hr();
    }
    case 'heading': {
      return this.renderer.heading(
        this.inline.output(this.token.text),
        this.token.depth,
        this.token.text);
    }
    case 'code': {
      return this.renderer.code(this.token.text,
        this.token.lang,
        this.token.escaped);
    }
    case 'table': {
      var header = ''
        , body = ''
        , i
        , row
        , cell
        , flags
        , j;

      // header
      cell = '';
      for (i = 0; i < this.token.header.length; i++) {
        flags = { header: true, align: this.token.align[i] };
        cell += this.renderer.tablecell(
          this.inline.output(this.token.header[i]),
          { header: true, align: this.token.align[i] }
        );
      }
      header += this.renderer.tablerow(cell);

      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];

        cell = '';
        for (j = 0; j < row.length; j++) {
          cell += this.renderer.tablecell(
            this.inline.output(row[j]),
            { header: false, align: this.token.align[j] }
          );
        }

        body += this.renderer.tablerow(cell);
      }
      return this.renderer.table(header, body);
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this.tok();
      }

      return this.renderer.blockquote(body);
    }
    case 'list_start': {
      var body = ''
        , ordered = this.token.ordered;

      while (this.next().type !== 'list_end') {
        body += this.tok();
      }

      return this.renderer.list(body, ordered);
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.token.type === 'text'
          ? this.parseText()
          : this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'html': {
      var html = !this.token.pre && !this.options.pedantic
        ? this.inline.output(this.token.text)
        : this.token.text;
      return this.renderer.html(html);
    }
    case 'paragraph': {
      return this.renderer.paragraph(this.inline.output(this.token.text));
    }
    case 'text': {
      return this.renderer.paragraph(this.parseText());
    }
  }
};

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescape(html) {
  return html.replace(/&([#\w]+);/g, function(_, n) {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}


/**
 * Marked
 */

function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge({}, marked.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt)
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function(err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      var out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge(marked.defaults, opt);
  return marked;
};

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  sanitizer: null,
  mangle: true,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  renderer: new Renderer,
  xhtml: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Renderer = Renderer;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;

if (typeof module !== 'undefined' && typeof exports === 'object') {
  module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return marked; });
} else {
  this.marked = marked;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],"/Users/jon/jupyter/notebook/node_modules/moment/moment.js":[function(require,module,exports){
(function (global){
//! moment.js
//! version : 2.8.4
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (undefined) {
    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = '2.8.4',
        // the global-scope this is NOT the global object in Node.js
        globalScope = typeof global !== 'undefined' ? global : this,
        oldGlobalMoment,
        round = Math.round,
        hasOwnProperty = Object.prototype.hasOwnProperty,
        i,

        YEAR = 0,
        MONTH = 1,
        DATE = 2,
        HOUR = 3,
        MINUTE = 4,
        SECOND = 5,
        MILLISECOND = 6,

        // internal storage for locale config files
        locales = {},

        // extra moment internal properties (plugins register props here)
        momentProperties = [],

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module && module.exports),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
        aspNetTimeSpanJsonRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,

        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
        isoDurationRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|x|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenOneToFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenOneToSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
        parseTokenDigits = /\d+/, // nonzero number of digits
        parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, // any word (or two) characters or numbers including two/three word month in arabic.
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO separator)
        parseTokenOffsetMs = /[\+\-]?\d+/, // 1234567890123
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123

        //strict parsing regexes
        parseTokenOneDigit = /\d/, // 0 - 9
        parseTokenTwoDigits = /\d\d/, // 00 - 99
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{4}/, // 0000 - 9999
        parseTokenSixDigits = /[+-]?\d{6}/, // -999,999 - 999,999
        parseTokenSignedNumber = /[+-]?\d+/, // -inf - inf

        // iso 8601 regex
        // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
        isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,

        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        isoDates = [
            ['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/],
            ['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/],
            ['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/],
            ['GGGG-[W]WW', /\d{4}-W\d{2}/],
            ['YYYY-DDD', /\d{4}-\d{3}/]
        ],

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/],
            ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
            ['HH:mm', /(T| )\d\d:\d\d/],
            ['HH', /(T| )\d\d/]
        ],

        // timezone chunker '+10:00' > ['10', '00'] or '-1530' > ['-15', '30']
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        unitAliases = {
            ms : 'millisecond',
            s : 'second',
            m : 'minute',
            h : 'hour',
            d : 'day',
            D : 'date',
            w : 'week',
            W : 'isoWeek',
            M : 'month',
            Q : 'quarter',
            y : 'year',
            DDD : 'dayOfYear',
            e : 'weekday',
            E : 'isoWeekday',
            gg: 'weekYear',
            GG: 'isoWeekYear'
        },

        camelFunctions = {
            dayofyear : 'dayOfYear',
            isoweekday : 'isoWeekday',
            isoweek : 'isoWeek',
            weekyear : 'weekYear',
            isoweekyear : 'isoWeekYear'
        },

        // format function strings
        formatFunctions = {},

        // default relative time thresholds
        relativeTimeThresholds = {
            s: 45,  // seconds to minute
            m: 45,  // minutes to hour
            h: 22,  // hours to day
            d: 26,  // days to month
            M: 11   // months to year
        },

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),

        formatTokenFunctions = {
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return this.localeData().monthsShort(this, format);
            },
            MMMM : function (format) {
                return this.localeData().months(this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                return this.dayOfYear();
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return this.localeData().weekdaysMin(this, format);
            },
            ddd  : function (format) {
                return this.localeData().weekdaysShort(this, format);
            },
            dddd : function (format) {
                return this.localeData().weekdays(this, format);
            },
            w    : function () {
                return this.week();
            },
            W    : function () {
                return this.isoWeek();
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            YYYYY : function () {
                return leftZeroFill(this.year(), 5);
            },
            YYYYYY : function () {
                var y = this.year(), sign = y >= 0 ? '+' : '-';
                return sign + leftZeroFill(Math.abs(y), 6);
            },
            gg   : function () {
                return leftZeroFill(this.weekYear() % 100, 2);
            },
            gggg : function () {
                return leftZeroFill(this.weekYear(), 4);
            },
            ggggg : function () {
                return leftZeroFill(this.weekYear(), 5);
            },
            GG   : function () {
                return leftZeroFill(this.isoWeekYear() % 100, 2);
            },
            GGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 4);
            },
            GGGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 5);
            },
            e : function () {
                return this.weekday();
            },
            E : function () {
                return this.isoWeekday();
            },
            a    : function () {
                return this.localeData().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.localeData().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return toInt(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(toInt(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            SSSS : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = -this.zone(),
                    b = '+';
                if (a < 0) {
                    a = -a;
                    b = '-';
                }
                return b + leftZeroFill(toInt(a / 60), 2) + ':' + leftZeroFill(toInt(a) % 60, 2);
            },
            ZZ   : function () {
                var a = -this.zone(),
                    b = '+';
                if (a < 0) {
                    a = -a;
                    b = '-';
                }
                return b + leftZeroFill(toInt(a / 60), 2) + leftZeroFill(toInt(a) % 60, 2);
            },
            z : function () {
                return this.zoneAbbr();
            },
            zz : function () {
                return this.zoneName();
            },
            x    : function () {
                return this.valueOf();
            },
            X    : function () {
                return this.unix();
            },
            Q : function () {
                return this.quarter();
            }
        },

        deprecations = {},

        lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'];

    // Pick the first defined of two or three arguments. dfl comes from
    // default.
    function dfl(a, b, c) {
        switch (arguments.length) {
            case 2: return a != null ? a : b;
            case 3: return a != null ? a : b != null ? b : c;
            default: throw new Error('Implement me');
        }
    }

    function hasOwnProp(a, b) {
        return hasOwnProperty.call(a, b);
    }

    function defaultParsingFlags() {
        // We need to deep clone this object, and es5 standard is not very
        // helpful.
        return {
            empty : false,
            unusedTokens : [],
            unusedInput : [],
            overflow : -2,
            charsLeftOver : 0,
            nullInput : false,
            invalidMonth : null,
            invalidFormat : false,
            userInvalidated : false,
            iso: false
        };
    }

    function printMsg(msg) {
        if (moment.suppressDeprecationWarnings === false &&
                typeof console !== 'undefined' && console.warn) {
            console.warn('Deprecation warning: ' + msg);
        }
    }

    function deprecate(msg, fn) {
        var firstTime = true;
        return extend(function () {
            if (firstTime) {
                printMsg(msg);
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    function deprecateSimple(name, msg) {
        if (!deprecations[name]) {
            printMsg(msg);
            deprecations[name] = true;
        }
    }

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func, period) {
        return function (a) {
            return this.localeData().ordinal(func.call(this, a), period);
        };
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    /************************************
        Constructors
    ************************************/

    function Locale() {
    }

    // Moment prototype object
    function Moment(config, skipOverflow) {
        if (skipOverflow !== false) {
            checkOverflow(config);
        }
        copyConfig(this, config);
        this._d = new Date(+config._d);
    }

    // Duration Constructor
    function Duration(duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._locale = moment.localeData();

        this._bubble();
    }

    /************************************
        Helpers
    ************************************/


    function extend(a, b) {
        for (var i in b) {
            if (hasOwnProp(b, i)) {
                a[i] = b[i];
            }
        }

        if (hasOwnProp(b, 'toString')) {
            a.toString = b.toString;
        }

        if (hasOwnProp(b, 'valueOf')) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function copyConfig(to, from) {
        var i, prop, val;

        if (typeof from._isAMomentObject !== 'undefined') {
            to._isAMomentObject = from._isAMomentObject;
        }
        if (typeof from._i !== 'undefined') {
            to._i = from._i;
        }
        if (typeof from._f !== 'undefined') {
            to._f = from._f;
        }
        if (typeof from._l !== 'undefined') {
            to._l = from._l;
        }
        if (typeof from._strict !== 'undefined') {
            to._strict = from._strict;
        }
        if (typeof from._tzm !== 'undefined') {
            to._tzm = from._tzm;
        }
        if (typeof from._isUTC !== 'undefined') {
            to._isUTC = from._isUTC;
        }
        if (typeof from._offset !== 'undefined') {
            to._offset = from._offset;
        }
        if (typeof from._pf !== 'undefined') {
            to._pf = from._pf;
        }
        if (typeof from._locale !== 'undefined') {
            to._locale = from._locale;
        }

        if (momentProperties.length > 0) {
            for (i in momentProperties) {
                prop = momentProperties[i];
                val = from[prop];
                if (typeof val !== 'undefined') {
                    to[prop] = val;
                }
            }
        }

        return to;
    }

    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength, forceSign) {
        var output = '' + Math.abs(number),
            sign = number >= 0;

        while (output.length < targetLength) {
            output = '0' + output;
        }
        return (sign ? (forceSign ? '+' : '') : '-') + output;
    }

    function positiveMomentsDifference(base, other) {
        var res = {milliseconds: 0, months: 0};

        res.months = other.month() - base.month() +
            (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, 'M').isAfter(other)) {
            --res.months;
        }

        res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

        return res;
    }

    function momentsDifference(base, other) {
        var res;
        other = makeAs(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    // TODO: remove 'name' arg after deprecation is removed
    function createAdder(direction, name) {
        return function (val, period) {
            var dur, tmp;
            //invert the arguments, but complain about it
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period).');
                tmp = val; val = period; period = tmp;
            }

            val = typeof val === 'string' ? +val : val;
            dur = moment.duration(val, period);
            addOrSubtractDurationFromMoment(this, dur, direction);
            return this;
        };
    }

    function addOrSubtractDurationFromMoment(mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = duration._days,
            months = duration._months;
        updateOffset = updateOffset == null ? true : updateOffset;

        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        if (days) {
            rawSetter(mom, 'Date', rawGetter(mom, 'Date') + days * isAdding);
        }
        if (months) {
            rawMonthSetter(mom, rawGetter(mom, 'Month') + months * isAdding);
        }
        if (updateOffset) {
            moment.updateOffset(mom, days || months);
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return Object.prototype.toString.call(input) === '[object Date]' ||
            input instanceof Date;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function normalizeUnits(units) {
        if (units) {
            var lowered = units.toLowerCase().replace(/(.)s$/, '$1');
            units = unitAliases[units] || camelFunctions[lowered] || lowered;
        }
        return units;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (hasOwnProp(inputObject, prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    function makeList(field) {
        var count, setter;

        if (field.indexOf('week') === 0) {
            count = 7;
            setter = 'day';
        }
        else if (field.indexOf('month') === 0) {
            count = 12;
            setter = 'month';
        }
        else {
            return;
        }

        moment[field] = function (format, index) {
            var i, getter,
                method = moment._locale[field],
                results = [];

            if (typeof format === 'number') {
                index = format;
                format = undefined;
            }

            getter = function (i) {
                var m = moment().utc().set(setter, i);
                return method.call(moment._locale, m, format || '');
            };

            if (index != null) {
                return getter(index);
            }
            else {
                for (i = 0; i < count; i++) {
                    results.push(getter(i));
                }
                return results;
            }
        };
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            if (coercedNumber >= 0) {
                value = Math.floor(coercedNumber);
            } else {
                value = Math.ceil(coercedNumber);
            }
        }

        return value;
    }

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    function weeksInYear(year, dow, doy) {
        return weekOfYear(moment([year, 11, 31 + dow - doy]), dow, doy).week;
    }

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function checkOverflow(m) {
        var overflow;
        if (m._a && m._pf.overflow === -2) {
            overflow =
                m._a[MONTH] < 0 || m._a[MONTH] > 11 ? MONTH :
                m._a[DATE] < 1 || m._a[DATE] > daysInMonth(m._a[YEAR], m._a[MONTH]) ? DATE :
                m._a[HOUR] < 0 || m._a[HOUR] > 24 ||
                    (m._a[HOUR] === 24 && (m._a[MINUTE] !== 0 ||
                                           m._a[SECOND] !== 0 ||
                                           m._a[MILLISECOND] !== 0)) ? HOUR :
                m._a[MINUTE] < 0 || m._a[MINUTE] > 59 ? MINUTE :
                m._a[SECOND] < 0 || m._a[SECOND] > 59 ? SECOND :
                m._a[MILLISECOND] < 0 || m._a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (m._pf._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }

            m._pf.overflow = overflow;
        }
    }

    function isValid(m) {
        if (m._isValid == null) {
            m._isValid = !isNaN(m._d.getTime()) &&
                m._pf.overflow < 0 &&
                !m._pf.empty &&
                !m._pf.invalidMonth &&
                !m._pf.nullInput &&
                !m._pf.invalidFormat &&
                !m._pf.userInvalidated;

            if (m._strict) {
                m._isValid = m._isValid &&
                    m._pf.charsLeftOver === 0 &&
                    m._pf.unusedTokens.length === 0 &&
                    m._pf.bigHour === undefined;
            }
        }
        return m._isValid;
    }

    function normalizeLocale(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // pick the locale from the array
    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    function chooseLocale(names) {
        var i = 0, j, next, locale, split;

        while (i < names.length) {
            split = normalizeLocale(names[i]).split('-');
            j = split.length;
            next = normalizeLocale(names[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                locale = loadLocale(split.slice(0, j).join('-'));
                if (locale) {
                    return locale;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return null;
    }

    function loadLocale(name) {
        var oldLocale = null;
        if (!locales[name] && hasModule) {
            try {
                oldLocale = moment.locale();
                require('./locale/' + name);
                // because defineLocale currently also sets the global locale, we want to undo that for lazy loaded locales
                moment.locale(oldLocale);
            } catch (e) { }
        }
        return locales[name];
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function makeAs(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff = (moment.isMoment(input) || isDate(input) ?
                    +input : +moment(input)) - (+res);
            // Use low-level api, because this fn is low-level api.
            res._d.setTime(+res._d + diff);
            moment.updateOffset(res, false);
            return res;
        } else {
            return moment(input).local();
        }
    }

    /************************************
        Locale
    ************************************/


    extend(Locale.prototype, {

        set : function (config) {
            var prop, i;
            for (i in config) {
                prop = config[i];
                if (typeof prop === 'function') {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
            // Lenient ordinal parsing accepts just a number in addition to
            // number + (possibly) stuff coming from _ordinalParseLenient.
            this._ordinalParseLenient = new RegExp(this._ordinalParse.source + '|' + /\d{1,2}/.source);
        },

        _months : 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_'),
        months : function (m) {
            return this._months[m.month()];
        },

        _monthsShort : 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_'),
        monthsShort : function (m) {
            return this._monthsShort[m.month()];
        },

        monthsParse : function (monthName, format, strict) {
            var i, mom, regex;

            if (!this._monthsParse) {
                this._monthsParse = [];
                this._longMonthsParse = [];
                this._shortMonthsParse = [];
            }

            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                mom = moment.utc([2000, i]);
                if (strict && !this._longMonthsParse[i]) {
                    this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
                    this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
                }
                if (!strict && !this._monthsParse[i]) {
                    regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
                    return i;
                } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
                    return i;
                } else if (!strict && this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        },

        _weekdays : 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
        weekdays : function (m) {
            return this._weekdays[m.day()];
        },

        _weekdaysShort : 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        weekdaysShort : function (m) {
            return this._weekdaysShort[m.day()];
        },

        _weekdaysMin : 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        weekdaysMin : function (m) {
            return this._weekdaysMin[m.day()];
        },

        weekdaysParse : function (weekdayName) {
            var i, mom, regex;

            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
            }

            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already
                if (!this._weekdaysParse[i]) {
                    mom = moment([2000, 1]).day(i);
                    regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                    this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._weekdaysParse[i].test(weekdayName)) {
                    return i;
                }
            }
        },

        _longDateFormat : {
            LTS : 'h:mm:ss A',
            LT : 'h:mm A',
            L : 'MM/DD/YYYY',
            LL : 'MMMM D, YYYY',
            LLL : 'MMMM D, YYYY LT',
            LLLL : 'dddd, MMMM D, YYYY LT'
        },
        longDateFormat : function (key) {
            var output = this._longDateFormat[key];
            if (!output && this._longDateFormat[key.toUpperCase()]) {
                output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
                    return val.slice(1);
                });
                this._longDateFormat[key] = output;
            }
            return output;
        },

        isPM : function (input) {
            // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
            // Using charAt should be more compatible.
            return ((input + '').toLowerCase().charAt(0) === 'p');
        },

        _meridiemParse : /[ap]\.?m?\.?/i,
        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },

        _calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[Last] dddd [at] LT',
            sameElse : 'L'
        },
        calendar : function (key, mom, now) {
            var output = this._calendar[key];
            return typeof output === 'function' ? output.apply(mom, [now]) : output;
        },

        _relativeTime : {
            future : 'in %s',
            past : '%s ago',
            s : 'a few seconds',
            m : 'a minute',
            mm : '%d minutes',
            h : 'an hour',
            hh : '%d hours',
            d : 'a day',
            dd : '%d days',
            M : 'a month',
            MM : '%d months',
            y : 'a year',
            yy : '%d years'
        },

        relativeTime : function (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (typeof output === 'function') ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        },

        pastFuture : function (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
        },

        ordinal : function (number) {
            return this._ordinal.replace('%d', number);
        },
        _ordinal : '%d',
        _ordinalParse : /\d{1,2}/,

        preparse : function (string) {
            return string;
        },

        postformat : function (string) {
            return string;
        },

        week : function (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy).week;
        },

        _week : {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 1st is the first week of the year.
        },

        _invalidDate: 'Invalid date',
        invalidDate: function () {
            return this._invalidDate;
        }
    });

    /************************************
        Formatting
    ************************************/


    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, '');
        }
        return input.replace(/\\/g, '');
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = '';
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        if (!m.isValid()) {
            return m.localeData().invalidDate();
        }

        format = expandFormat(format, m.localeData());

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

        return formatFunctions[format](m);
    }

    function expandFormat(format, locale) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return locale.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token, config) {
        var a, strict = config._strict;
        switch (token) {
        case 'Q':
            return parseTokenOneDigit;
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
        case 'GGGG':
        case 'gggg':
            return strict ? parseTokenFourDigits : parseTokenOneToFourDigits;
        case 'Y':
        case 'G':
        case 'g':
            return parseTokenSignedNumber;
        case 'YYYYYY':
        case 'YYYYY':
        case 'GGGGG':
        case 'ggggg':
            return strict ? parseTokenSixDigits : parseTokenOneToSixDigits;
        case 'S':
            if (strict) {
                return parseTokenOneDigit;
            }
            /* falls through */
        case 'SS':
            if (strict) {
                return parseTokenTwoDigits;
            }
            /* falls through */
        case 'SSS':
            if (strict) {
                return parseTokenThreeDigits;
            }
            /* falls through */
        case 'DDD':
            return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
            return parseTokenWord;
        case 'a':
        case 'A':
            return config._locale._meridiemParse;
        case 'x':
            return parseTokenOffsetMs;
        case 'X':
            return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'SSSS':
            return parseTokenDigits;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'GG':
        case 'gg':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'ww':
        case 'WW':
            return strict ? parseTokenTwoDigits : parseTokenOneOrTwoDigits;
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
        case 'w':
        case 'W':
        case 'e':
        case 'E':
            return parseTokenOneOrTwoDigits;
        case 'Do':
            return strict ? config._locale._ordinalParse : config._locale._ordinalParseLenient;
        default :
            a = new RegExp(regexpEscape(unescapeFormat(token.replace('\\', '')), 'i'));
            return a;
        }
    }

    function timezoneMinutesFromString(string) {
        string = string || '';
        var possibleTzMatches = (string.match(parseTokenTimezone) || []),
            tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
            parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
            minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? -minutes : minutes;
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, config) {
        var a, datePartArray = config._a;

        switch (token) {
        // QUARTER
        case 'Q':
            if (input != null) {
                datePartArray[MONTH] = (toInt(input) - 1) * 3;
            }
            break;
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            if (input != null) {
                datePartArray[MONTH] = toInt(input) - 1;
            }
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            a = config._locale.monthsParse(input, token, config._strict);
            // if we didn't find a month name, mark the date as invalid.
            if (a != null) {
                datePartArray[MONTH] = a;
            } else {
                config._pf.invalidMonth = input;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DD
        case 'DD' :
            if (input != null) {
                datePartArray[DATE] = toInt(input);
            }
            break;
        case 'Do' :
            if (input != null) {
                datePartArray[DATE] = toInt(parseInt(
                            input.match(/\d{1,2}/)[0], 10));
            }
            break;
        // DAY OF YEAR
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                config._dayOfYear = toInt(input);
            }

            break;
        // YEAR
        case 'YY' :
            datePartArray[YEAR] = moment.parseTwoDigitYear(input);
            break;
        case 'YYYY' :
        case 'YYYYY' :
        case 'YYYYYY' :
            datePartArray[YEAR] = toInt(input);
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config._isPm = config._locale.isPM(input);
            break;
        // HOUR
        case 'h' : // fall through to hh
        case 'hh' :
            config._pf.bigHour = true;
            /* falls through */
        case 'H' : // fall through to HH
        case 'HH' :
            datePartArray[HOUR] = toInt(input);
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[MINUTE] = toInt(input);
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[SECOND] = toInt(input);
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
        case 'SSSS' :
            datePartArray[MILLISECOND] = toInt(('0.' + input) * 1000);
            break;
        // UNIX OFFSET (MILLISECONDS)
        case 'x':
            config._d = new Date(toInt(input));
            break;
        // UNIX TIMESTAMP WITH MS
        case 'X':
            config._d = new Date(parseFloat(input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config._useUTC = true;
            config._tzm = timezoneMinutesFromString(input);
            break;
        // WEEKDAY - human
        case 'dd':
        case 'ddd':
        case 'dddd':
            a = config._locale.weekdaysParse(input);
            // if we didn't get a weekday name, mark the date as invalid
            if (a != null) {
                config._w = config._w || {};
                config._w['d'] = a;
            } else {
                config._pf.invalidWeekday = input;
            }
            break;
        // WEEK, WEEK DAY - numeric
        case 'w':
        case 'ww':
        case 'W':
        case 'WW':
        case 'd':
        case 'e':
        case 'E':
            token = token.substr(0, 1);
            /* falls through */
        case 'gggg':
        case 'GGGG':
        case 'GGGGG':
            token = token.substr(0, 2);
            if (input) {
                config._w = config._w || {};
                config._w[token] = toInt(input);
            }
            break;
        case 'gg':
        case 'GG':
            config._w = config._w || {};
            config._w[token] = moment.parseTwoDigitYear(input);
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = dfl(w.GG, config._a[YEAR], weekOfYear(moment(), 1, 4).year);
            week = dfl(w.W, 1);
            weekday = dfl(w.E, 1);
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;

            weekYear = dfl(w.gg, config._a[YEAR], weekOfYear(moment(), dow, doy).year);
            week = dfl(w.w, 1);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < dow) {
                    ++week;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from begining of week
                weekday = w.e + dow;
            } else {
                // default to begining of week
                weekday = dow;
            }
        }
        temp = dayOfYearFromWeeks(weekYear, week, weekday, doy, dow);

        config._a[YEAR] = temp.year;
        config._dayOfYear = temp.dayOfYear;
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromConfig(config) {
        var i, date, input = [], currentDate, yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear) {
            yearToUse = dfl(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse)) {
                config._pf._overflowDayOfYear = true;
            }

            date = makeUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // Check for 24:00:00.000
        if (config._a[HOUR] === 24 &&
                config._a[MINUTE] === 0 &&
                config._a[SECOND] === 0 &&
                config._a[MILLISECOND] === 0) {
            config._nextDay = true;
            config._a[HOUR] = 0;
        }

        config._d = (config._useUTC ? makeUTCDate : makeDate).apply(null, input);
        // Apply timezone offset from input. The actual zone can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() + config._tzm);
        }

        if (config._nextDay) {
            config._a[HOUR] = 24;
        }
    }

    function dateFromObject(config) {
        var normalizedInput;

        if (config._d) {
            return;
        }

        normalizedInput = normalizeObjectUnits(config._i);
        config._a = [
            normalizedInput.year,
            normalizedInput.month,
            normalizedInput.day || normalizedInput.date,
            normalizedInput.hour,
            normalizedInput.minute,
            normalizedInput.second,
            normalizedInput.millisecond
        ];

        dateFromConfig(config);
    }

    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
            ];
        } else {
            return [now.getFullYear(), now.getMonth(), now.getDate()];
        }
    }

    // date from string and format string
    function makeDateFromStringAndFormat(config) {
        if (config._f === moment.ISO_8601) {
            parseISO(config);
            return;
        }

        config._a = [];
        config._pf.empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    config._pf.unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    config._pf.empty = false;
                }
                else {
                    config._pf.unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                config._pf.unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        config._pf.charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            config._pf.unusedInput.push(string);
        }

        // clear _12h flag if hour is <= 12
        if (config._pf.bigHour === true && config._a[HOUR] <= 12) {
            config._pf.bigHour = undefined;
        }
        // handle am pm
        if (config._isPm && config._a[HOUR] < 12) {
            config._a[HOUR] += 12;
        }
        // if is 12 am, change hours to 0
        if (config._isPm === false && config._a[HOUR] === 12) {
            config._a[HOUR] = 0;
        }
        dateFromConfig(config);
        checkOverflow(config);
    }

    function unescapeFormat(s) {
        return s.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        });
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function regexpEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            config._pf.invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._pf = defaultParsingFlags();
            tempConfig._f = config._f[i];
            makeDateFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += tempConfig._pf.charsLeftOver;

            //or tokens
            currentScore += tempConfig._pf.unusedTokens.length * 10;

            tempConfig._pf.score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    // date from iso format
    function parseISO(config) {
        var i, l,
            string = config._i,
            match = isoRegex.exec(string);

        if (match) {
            config._pf.iso = true;
            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(string)) {
                    // match[5] should be 'T' or undefined
                    config._f = isoDates[i][0] + (match[6] || ' ');
                    break;
                }
            }
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (string.match(parseTokenTimezone)) {
                config._f += 'Z';
            }
            makeDateFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function makeDateFromString(config) {
        parseISO(config);
        if (config._isValid === false) {
            delete config._isValid;
            moment.createFromInputFallback(config);
        }
    }

    function map(arr, fn) {
        var res = [], i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }

    function makeDateFromInput(config) {
        var input = config._i, matched;
        if (input === undefined) {
            config._d = new Date();
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if ((matched = aspNetJsonRegex.exec(input)) !== null) {
            config._d = new Date(+matched[1]);
        } else if (typeof input === 'string') {
            makeDateFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function (obj) {
                return parseInt(obj, 10);
            });
            dateFromConfig(config);
        } else if (typeof(input) === 'object') {
            dateFromObject(config);
        } else if (typeof(input) === 'number') {
            // from milliseconds
            config._d = new Date(input);
        } else {
            moment.createFromInputFallback(config);
        }
    }

    function makeDate(y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor doesn't accept years < 1970
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }

    function makeUTCDate(y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    function parseWeekday(input, locale) {
        if (typeof input === 'string') {
            if (!isNaN(input)) {
                input = parseInt(input, 10);
            }
            else {
                input = locale.weekdaysParse(input);
                if (typeof input !== 'number') {
                    return null;
                }
            }
        }
        return input;
    }

    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime(posNegDuration, withoutSuffix, locale) {
        var duration = moment.duration(posNegDuration).abs(),
            seconds = round(duration.as('s')),
            minutes = round(duration.as('m')),
            hours = round(duration.as('h')),
            days = round(duration.as('d')),
            months = round(duration.as('M')),
            years = round(duration.as('y')),

            args = seconds < relativeTimeThresholds.s && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < relativeTimeThresholds.m && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < relativeTimeThresholds.h && ['hh', hours] ||
                days === 1 && ['d'] ||
                days < relativeTimeThresholds.d && ['dd', days] ||
                months === 1 && ['M'] ||
                months < relativeTimeThresholds.M && ['MM', months] ||
                years === 1 && ['y'] || ['yy', years];

        args[2] = withoutSuffix;
        args[3] = +posNegDuration > 0;
        args[4] = locale;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Week of Year
    ************************************/


    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
            adjustedMoment;


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        adjustedMoment = moment(mom).add(daysToDayOfWeek, 'd');
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        var d = makeUTCDate(year, 0, 1).getUTCDay(), daysToAdd, dayOfYear;

        d = d === 0 ? 7 : d;
        weekday = weekday != null ? weekday : firstDayOfWeek;
        daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0) - (d < firstDayOfWeek ? 7 : 0);
        dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;

        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ?  dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }

    /************************************
        Top Level Functions
    ************************************/

    function makeMoment(config) {
        var input = config._i,
            format = config._f,
            res;

        config._locale = config._locale || moment.localeData(config._l);

        if (input === null || (format === undefined && input === '')) {
            return moment.invalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = config._locale.preparse(input);
        }

        if (moment.isMoment(input)) {
            return new Moment(input, true);
        } else if (format) {
            if (isArray(format)) {
                makeDateFromStringAndArray(config);
            } else {
                makeDateFromStringAndFormat(config);
            }
        } else {
            makeDateFromInput(config);
        }

        res = new Moment(config);
        if (res._nextDay) {
            // Adding is smart enough around DST
            res.add(1, 'd');
            res._nextDay = undefined;
        }

        return res;
    }

    moment = function (input, format, locale, strict) {
        var c;

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._i = input;
        c._f = format;
        c._l = locale;
        c._strict = strict;
        c._isUTC = false;
        c._pf = defaultParsingFlags();

        return makeMoment(c);
    };

    moment.suppressDeprecationWarnings = false;

    moment.createFromInputFallback = deprecate(
        'moment construction falls back to js Date. This is ' +
        'discouraged and will be removed in upcoming major ' +
        'release. Please refer to ' +
        'https://github.com/moment/moment/issues/1407 for more info.',
        function (config) {
            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
        }
    );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return moment();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    moment.min = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    };

    moment.max = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    };

    // creating with utc
    moment.utc = function (input, format, locale, strict) {
        var c;

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._useUTC = true;
        c._isUTC = true;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;
        c._pf = defaultParsingFlags();

        return makeMoment(c).utc();
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            parseIso,
            diffRes;

        if (moment.isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetTimeSpanJsonRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = isoDurationRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            parseIso = function (inp) {
                // We'd normally use ~~inp for this, but unfortunately it also
                // converts floats to ints.
                // inp may be undefined, so careful calling replace on it.
                var res = inp && parseFloat(inp.replace(',', '.'));
                // apply sign while we're at it
                return (isNaN(res) ? 0 : res) * sign;
            };
            duration = {
                y: parseIso(match[2]),
                M: parseIso(match[3]),
                d: parseIso(match[4]),
                h: parseIso(match[5]),
                m: parseIso(match[6]),
                s: parseIso(match[7]),
                w: parseIso(match[8])
            };
        } else if (typeof duration === 'object' &&
                ('from' in duration || 'to' in duration)) {
            diffRes = momentsDifference(moment(duration.from), moment(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (moment.isDuration(input) && hasOwnProp(input, '_locale')) {
            ret._locale = input._locale;
        }

        return ret;
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // constant that refers to the ISO standard
    moment.ISO_8601 = function () {};

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    moment.momentProperties = momentProperties;

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    moment.updateOffset = function () {};

    // This function allows you to set a threshold for relative time strings
    moment.relativeTimeThreshold = function (threshold, limit) {
        if (relativeTimeThresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return relativeTimeThresholds[threshold];
        }
        relativeTimeThresholds[threshold] = limit;
        return true;
    };

    moment.lang = deprecate(
        'moment.lang is deprecated. Use moment.locale instead.',
        function (key, value) {
            return moment.locale(key, value);
        }
    );

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    moment.locale = function (key, values) {
        var data;
        if (key) {
            if (typeof(values) !== 'undefined') {
                data = moment.defineLocale(key, values);
            }
            else {
                data = moment.localeData(key);
            }

            if (data) {
                moment.duration._locale = moment._locale = data;
            }
        }

        return moment._locale._abbr;
    };

    moment.defineLocale = function (name, values) {
        if (values !== null) {
            values.abbr = name;
            if (!locales[name]) {
                locales[name] = new Locale();
            }
            locales[name].set(values);

            // backwards compat for now: also set the locale
            moment.locale(name);

            return locales[name];
        } else {
            // useful for testing
            delete locales[name];
            return null;
        }
    };

    moment.langData = deprecate(
        'moment.langData is deprecated. Use moment.localeData instead.',
        function (key) {
            return moment.localeData(key);
        }
    );

    // returns locale data
    moment.localeData = function (key) {
        var locale;

        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }

        if (!key) {
            return moment._locale;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            locale = loadLocale(key);
            if (locale) {
                return locale;
            }
            key = [key];
        }

        return chooseLocale(key);
    };

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment ||
            (obj != null && hasOwnProp(obj, '_isAMomentObject'));
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };

    for (i = lists.length - 1; i >= 0; --i) {
        makeList(lists[i]);
    }

    moment.normalizeUnits = function (units) {
        return normalizeUnits(units);
    };

    moment.invalid = function (flags) {
        var m = moment.utc(NaN);
        if (flags != null) {
            extend(m._pf, flags);
        }
        else {
            m._pf.userInvalidated = true;
        }

        return m;
    };

    moment.parseZone = function () {
        return moment.apply(null, arguments).parseZone();
    };

    moment.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    /************************************
        Moment Prototype
    ************************************/


    extend(moment.fn = Moment.prototype, {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d + ((this._offset || 0) * 60000);
        },

        unix : function () {
            return Math.floor(+this / 1000);
        },

        toString : function () {
            return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
        },

        toDate : function () {
            return this._offset ? new Date(+this) : this._d;
        },

        toISOString : function () {
            var m = moment(this).utc();
            if (0 < m.year() && m.year() <= 9999) {
                if ('function' === typeof Date.prototype.toISOString) {
                    // native implementation is ~50x faster, use it when we can
                    return this.toDate().toISOString();
                } else {
                    return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
                }
            } else {
                return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds()
            ];
        },

        isValid : function () {
            return isValid(this);
        },

        isDSTShifted : function () {
            if (this._a) {
                return this.isValid() && compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray()) > 0;
            }

            return false;
        },

        parsingFlags : function () {
            return extend({}, this._pf);
        },

        invalidAt: function () {
            return this._pf.overflow;
        },

        utc : function (keepLocalTime) {
            return this.zone(0, keepLocalTime);
        },

        local : function (keepLocalTime) {
            if (this._isUTC) {
                this.zone(0, keepLocalTime);
                this._isUTC = false;

                if (keepLocalTime) {
                    this.add(this._dateTzOffset(), 'm');
                }
            }
            return this;
        },

        format : function (inputString) {
            var output = formatMoment(this, inputString || moment.defaultFormat);
            return this.localeData().postformat(output);
        },

        add : createAdder(1, 'add'),

        subtract : createAdder(-1, 'subtract'),

        diff : function (input, units, asFloat) {
            var that = makeAs(input, this),
                zoneDiff = (this.zone() - that.zone()) * 6e4,
                diff, output, daysAdjust;

            units = normalizeUnits(units);

            if (units === 'year' || units === 'month') {
                // average number of days in the months in the given dates
                diff = (this.daysInMonth() + that.daysInMonth()) * 432e5; // 24 * 60 * 60 * 1000 / 2
                // difference in months
                output = ((this.year() - that.year()) * 12) + (this.month() - that.month());
                // adjust by taking difference in days, average number of days
                // and dst in the given months.
                daysAdjust = (this - moment(this).startOf('month')) -
                    (that - moment(that).startOf('month'));
                // same as above but with zones, to negate all dst
                daysAdjust -= ((this.zone() - moment(this).startOf('month').zone()) -
                        (that.zone() - moment(that).startOf('month').zone())) * 6e4;
                output += daysAdjust / diff;
                if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = (this - that);
                output = units === 'second' ? diff / 1e3 : // 1000
                    units === 'minute' ? diff / 6e4 : // 1000 * 60
                    units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
                    units === 'day' ? (diff - zoneDiff) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                    units === 'week' ? (diff - zoneDiff) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                    diff;
            }
            return asFloat ? output : absRound(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function (time) {
            // We want to compare the start of today, vs this.
            // Getting start-of-today depends on whether we're zone'd or not.
            var now = time || moment(),
                sod = makeAs(now, this).startOf('day'),
                diff = this.diff(sod, 'days', true),
                format = diff < -6 ? 'sameElse' :
                    diff < -1 ? 'lastWeek' :
                    diff < 0 ? 'lastDay' :
                    diff < 1 ? 'sameDay' :
                    diff < 2 ? 'nextDay' :
                    diff < 7 ? 'nextWeek' : 'sameElse';
            return this.format(this.localeData().calendar(format, this, moment(now)));
        },

        isLeapYear : function () {
            return isLeapYear(this.year());
        },

        isDST : function () {
            return (this.zone() < this.clone().month(0).zone() ||
                this.zone() < this.clone().month(5).zone());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            if (input != null) {
                input = parseWeekday(input, this.localeData());
                return this.add(input - day, 'd');
            } else {
                return day;
            }
        },

        month : makeAccessor('Month', true),

        startOf : function (units) {
            units = normalizeUnits(units);
            // the following switch intentionally omits break keywords
            // to utilize falling through the cases.
            switch (units) {
            case 'year':
                this.month(0);
                /* falls through */
            case 'quarter':
            case 'month':
                this.date(1);
                /* falls through */
            case 'week':
            case 'isoWeek':
            case 'day':
                this.hours(0);
                /* falls through */
            case 'hour':
                this.minutes(0);
                /* falls through */
            case 'minute':
                this.seconds(0);
                /* falls through */
            case 'second':
                this.milliseconds(0);
                /* falls through */
            }

            // weeks are a special case
            if (units === 'week') {
                this.weekday(0);
            } else if (units === 'isoWeek') {
                this.isoWeekday(1);
            }

            // quarters are also special
            if (units === 'quarter') {
                this.month(Math.floor(this.month() / 3) * 3);
            }

            return this;
        },

        endOf: function (units) {
            units = normalizeUnits(units);
            if (units === undefined || units === 'millisecond') {
                return this;
            }
            return this.startOf(units).add(1, (units === 'isoWeek' ? 'week' : units)).subtract(1, 'ms');
        },

        isAfter: function (input, units) {
            var inputMs;
            units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this > +input;
            } else {
                inputMs = moment.isMoment(input) ? +input : +moment(input);
                return inputMs < +this.clone().startOf(units);
            }
        },

        isBefore: function (input, units) {
            var inputMs;
            units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this < +input;
            } else {
                inputMs = moment.isMoment(input) ? +input : +moment(input);
                return +this.clone().endOf(units) < inputMs;
            }
        },

        isSame: function (input, units) {
            var inputMs;
            units = normalizeUnits(units || 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this === +input;
            } else {
                inputMs = +moment(input);
                return +(this.clone().startOf(units)) <= inputMs && inputMs <= +(this.clone().endOf(units));
            }
        },

        min: deprecate(
                 'moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548',
                 function (other) {
                     other = moment.apply(null, arguments);
                     return other < this ? this : other;
                 }
         ),

        max: deprecate(
                'moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548',
                function (other) {
                    other = moment.apply(null, arguments);
                    return other > this ? this : other;
                }
        ),

        // keepLocalTime = true means only change the timezone, without
        // affecting the local hour. So 5:31:26 +0300 --[zone(2, true)]-->
        // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist int zone
        // +0200, so we adjust the time as needed, to be valid.
        //
        // Keeping the time actually adds/subtracts (one hour)
        // from the actual represented time. That is why we call updateOffset
        // a second time. In case it wants us to change the offset again
        // _changeInProgress == true case, then we have to adjust, because
        // there is no such time in the given timezone.
        zone : function (input, keepLocalTime) {
            var offset = this._offset || 0,
                localAdjust;
            if (input != null) {
                if (typeof input === 'string') {
                    input = timezoneMinutesFromString(input);
                }
                if (Math.abs(input) < 16) {
                    input = input * 60;
                }
                if (!this._isUTC && keepLocalTime) {
                    localAdjust = this._dateTzOffset();
                }
                this._offset = input;
                this._isUTC = true;
                if (localAdjust != null) {
                    this.subtract(localAdjust, 'm');
                }
                if (offset !== input) {
                    if (!keepLocalTime || this._changeInProgress) {
                        addOrSubtractDurationFromMoment(this,
                                moment.duration(offset - input, 'm'), 1, false);
                    } else if (!this._changeInProgress) {
                        this._changeInProgress = true;
                        moment.updateOffset(this, true);
                        this._changeInProgress = null;
                    }
                }
            } else {
                return this._isUTC ? offset : this._dateTzOffset();
            }
            return this;
        },

        zoneAbbr : function () {
            return this._isUTC ? 'UTC' : '';
        },

        zoneName : function () {
            return this._isUTC ? 'Coordinated Universal Time' : '';
        },

        parseZone : function () {
            if (this._tzm) {
                this.zone(this._tzm);
            } else if (typeof this._i === 'string') {
                this.zone(this._i);
            }
            return this;
        },

        hasAlignedHourOffset : function (input) {
            if (!input) {
                input = 0;
            }
            else {
                input = moment(input).zone();
            }

            return (this.zone() - input) % 60 === 0;
        },

        daysInMonth : function () {
            return daysInMonth(this.year(), this.month());
        },

        dayOfYear : function (input) {
            var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
        },

        quarter : function (input) {
            return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
        },

        weekYear : function (input) {
            var year = weekOfYear(this, this.localeData()._week.dow, this.localeData()._week.doy).year;
            return input == null ? year : this.add((input - year), 'y');
        },

        isoWeekYear : function (input) {
            var year = weekOfYear(this, 1, 4).year;
            return input == null ? year : this.add((input - year), 'y');
        },

        week : function (input) {
            var week = this.localeData().week(this);
            return input == null ? week : this.add((input - week) * 7, 'd');
        },

        isoWeek : function (input) {
            var week = weekOfYear(this, 1, 4).week;
            return input == null ? week : this.add((input - week) * 7, 'd');
        },

        weekday : function (input) {
            var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
            return input == null ? weekday : this.add(input - weekday, 'd');
        },

        isoWeekday : function (input) {
            // behaves the same as moment#day except
            // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
            // as a setter, sunday should belong to the previous week.
            return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
        },

        isoWeeksInYear : function () {
            return weeksInYear(this.year(), 1, 4);
        },

        weeksInYear : function () {
            var weekInfo = this.localeData()._week;
            return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units]();
        },

        set : function (units, value) {
            units = normalizeUnits(units);
            if (typeof this[units] === 'function') {
                this[units](value);
            }
            return this;
        },

        // If passed a locale key, it will set the locale for this
        // instance.  Otherwise, it will return the locale configuration
        // variables for this instance.
        locale : function (key) {
            var newLocaleData;

            if (key === undefined) {
                return this._locale._abbr;
            } else {
                newLocaleData = moment.localeData(key);
                if (newLocaleData != null) {
                    this._locale = newLocaleData;
                }
                return this;
            }
        },

        lang : deprecate(
            'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
            function (key) {
                if (key === undefined) {
                    return this.localeData();
                } else {
                    return this.locale(key);
                }
            }
        ),

        localeData : function () {
            return this._locale;
        },

        _dateTzOffset : function () {
            // On Firefox.24 Date#getTimezoneOffset returns a floating point.
            // https://github.com/moment/moment/pull/1871
            return Math.round(this._d.getTimezoneOffset() / 15) * 15;
        }
    });

    function rawMonthSetter(mom, value) {
        var dayOfMonth;

        // TODO: Move this out of here!
        if (typeof value === 'string') {
            value = mom.localeData().monthsParse(value);
            // TODO: Another silent failure?
            if (typeof value !== 'number') {
                return mom;
            }
        }

        dayOfMonth = Math.min(mom.date(),
                daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function rawGetter(mom, unit) {
        return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
    }

    function rawSetter(mom, unit, value) {
        if (unit === 'Month') {
            return rawMonthSetter(mom, value);
        } else {
            return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
        }
    }

    function makeAccessor(unit, keepTime) {
        return function (value) {
            if (value != null) {
                rawSetter(this, unit, value);
                moment.updateOffset(this, keepTime);
                return this;
            } else {
                return rawGetter(this, unit);
            }
        };
    }

    moment.fn.millisecond = moment.fn.milliseconds = makeAccessor('Milliseconds', false);
    moment.fn.second = moment.fn.seconds = makeAccessor('Seconds', false);
    moment.fn.minute = moment.fn.minutes = makeAccessor('Minutes', false);
    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    moment.fn.hour = moment.fn.hours = makeAccessor('Hours', true);
    // moment.fn.month is defined separately
    moment.fn.date = makeAccessor('Date', true);
    moment.fn.dates = deprecate('dates accessor is deprecated. Use date instead.', makeAccessor('Date', true));
    moment.fn.year = makeAccessor('FullYear', true);
    moment.fn.years = deprecate('years accessor is deprecated. Use year instead.', makeAccessor('FullYear', true));

    // add plural methods
    moment.fn.days = moment.fn.day;
    moment.fn.months = moment.fn.month;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;
    moment.fn.quarters = moment.fn.quarter;

    // add aliased format methods
    moment.fn.toJSON = moment.fn.toISOString;

    /************************************
        Duration Prototype
    ************************************/


    function daysToYears (days) {
        // 400 years have 146097 days (taking into account leap year rules)
        return days * 400 / 146097;
    }

    function yearsToDays (years) {
        // years * 365 + absRound(years / 4) -
        //     absRound(years / 100) + absRound(years / 400);
        return years * 146097 / 400;
    }

    extend(moment.duration.fn = Duration.prototype, {

        _bubble : function () {
            var milliseconds = this._milliseconds,
                days = this._days,
                months = this._months,
                data = this._data,
                seconds, minutes, hours, years = 0;

            // The following code bubbles up values, see the tests for
            // examples of what that means.
            data.milliseconds = milliseconds % 1000;

            seconds = absRound(milliseconds / 1000);
            data.seconds = seconds % 60;

            minutes = absRound(seconds / 60);
            data.minutes = minutes % 60;

            hours = absRound(minutes / 60);
            data.hours = hours % 24;

            days += absRound(hours / 24);

            // Accurately convert days to years, assume start from year 0.
            years = absRound(daysToYears(days));
            days -= absRound(yearsToDays(years));

            // 30 days to a month
            // TODO (iskren): Use anchor date (like 1st Jan) to compute this.
            months += absRound(days / 30);
            days %= 30;

            // 12 months -> 1 year
            years += absRound(months / 12);
            months %= 12;

            data.days = days;
            data.months = months;
            data.years = years;
        },

        abs : function () {
            this._milliseconds = Math.abs(this._milliseconds);
            this._days = Math.abs(this._days);
            this._months = Math.abs(this._months);

            this._data.milliseconds = Math.abs(this._data.milliseconds);
            this._data.seconds = Math.abs(this._data.seconds);
            this._data.minutes = Math.abs(this._data.minutes);
            this._data.hours = Math.abs(this._data.hours);
            this._data.months = Math.abs(this._data.months);
            this._data.years = Math.abs(this._data.years);

            return this;
        },

        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              (this._months % 12) * 2592e6 +
              toInt(this._months / 12) * 31536e6;
        },

        humanize : function (withSuffix) {
            var output = relativeTime(this, !withSuffix, this.localeData());

            if (withSuffix) {
                output = this.localeData().pastFuture(+this, output);
            }

            return this.localeData().postformat(output);
        },

        add : function (input, val) {
            // supports only 2.0-style add(1, 's') or add(moment)
            var dur = moment.duration(input, val);

            this._milliseconds += dur._milliseconds;
            this._days += dur._days;
            this._months += dur._months;

            this._bubble();

            return this;
        },

        subtract : function (input, val) {
            var dur = moment.duration(input, val);

            this._milliseconds -= dur._milliseconds;
            this._days -= dur._days;
            this._months -= dur._months;

            this._bubble();

            return this;
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units.toLowerCase() + 's']();
        },

        as : function (units) {
            var days, months;
            units = normalizeUnits(units);

            if (units === 'month' || units === 'year') {
                days = this._days + this._milliseconds / 864e5;
                months = this._months + daysToYears(days) * 12;
                return units === 'month' ? months : months / 12;
            } else {
                // handle milliseconds separately because of floating point math errors (issue #1867)
                days = this._days + Math.round(yearsToDays(this._months / 12));
                switch (units) {
                    case 'week': return days / 7 + this._milliseconds / 6048e5;
                    case 'day': return days + this._milliseconds / 864e5;
                    case 'hour': return days * 24 + this._milliseconds / 36e5;
                    case 'minute': return days * 24 * 60 + this._milliseconds / 6e4;
                    case 'second': return days * 24 * 60 * 60 + this._milliseconds / 1000;
                    // Math.floor prevents floating point math errors here
                    case 'millisecond': return Math.floor(days * 24 * 60 * 60 * 1000) + this._milliseconds;
                    default: throw new Error('Unknown unit ' + units);
                }
            }
        },

        lang : moment.fn.lang,
        locale : moment.fn.locale,

        toIsoString : deprecate(
            'toIsoString() is deprecated. Please use toISOString() instead ' +
            '(notice the capitals)',
            function () {
                return this.toISOString();
            }
        ),

        toISOString : function () {
            // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
            var years = Math.abs(this.years()),
                months = Math.abs(this.months()),
                days = Math.abs(this.days()),
                hours = Math.abs(this.hours()),
                minutes = Math.abs(this.minutes()),
                seconds = Math.abs(this.seconds() + this.milliseconds() / 1000);

            if (!this.asSeconds()) {
                // this is the same as C#'s (Noda) and python (isodate)...
                // but not other JS (goog.date)
                return 'P0D';
            }

            return (this.asSeconds() < 0 ? '-' : '') +
                'P' +
                (years ? years + 'Y' : '') +
                (months ? months + 'M' : '') +
                (days ? days + 'D' : '') +
                ((hours || minutes || seconds) ? 'T' : '') +
                (hours ? hours + 'H' : '') +
                (minutes ? minutes + 'M' : '') +
                (seconds ? seconds + 'S' : '');
        },

        localeData : function () {
            return this._locale;
        }
    });

    moment.duration.fn.toString = moment.duration.fn.toISOString;

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    for (i in unitMillisecondFactors) {
        if (hasOwnProp(unitMillisecondFactors, i)) {
            makeDurationGetter(i.toLowerCase());
        }
    }

    moment.duration.fn.asMilliseconds = function () {
        return this.as('ms');
    };
    moment.duration.fn.asSeconds = function () {
        return this.as('s');
    };
    moment.duration.fn.asMinutes = function () {
        return this.as('m');
    };
    moment.duration.fn.asHours = function () {
        return this.as('h');
    };
    moment.duration.fn.asDays = function () {
        return this.as('d');
    };
    moment.duration.fn.asWeeks = function () {
        return this.as('weeks');
    };
    moment.duration.fn.asMonths = function () {
        return this.as('M');
    };
    moment.duration.fn.asYears = function () {
        return this.as('y');
    };

    /************************************
        Default Locale
    ************************************/


    // Set default locale, other locale will inherit from English.
    moment.locale('en', {
        ordinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    /* EMBED_LOCALES */

    /************************************
        Exposing Moment
    ************************************/

    function makeGlobal(shouldDeprecate) {
        /*global ender:false */
        if (typeof ender !== 'undefined') {
            return;
        }
        oldGlobalMoment = globalScope.moment;
        if (shouldDeprecate) {
            globalScope.moment = deprecate(
                    'Accessing Moment through the global scope is ' +
                    'deprecated, and will be removed in an upcoming ' +
                    'release.',
                    moment);
        } else {
            globalScope.moment = moment;
        }
    }

    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
    } else if (typeof define === 'function' && define.amd) {
        define('moment', function (require, exports, module) {
            if (module.config && module.config() && module.config().noGlobal === true) {
                // release the global variable
                globalScope.moment = oldGlobalMoment;
            }

            return moment;
        });
        makeGlobal(true);
    } else {
        makeGlobal();
    }
}).call(this);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],"/Users/jon/jupyter/notebook/notebook/static-src/auth/js/loginmain.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

    var IPython = require('base/js/namespace');
    var page = require('base/js/page');

    module.exports = function loginMain() {
        var page_instance = new page.Page();
        $('button#login_submit').addClass("btn btn-default");
        page_instance.show();
        $('input#password_input').focus();

        IPython.page = page_instance;
    };

},{"base/js/namespace":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/namespace.js","base/js/page":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/page.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/auth/js/loginwidget.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

    "use strict";

    var utils = require('base/js/utils');

    var LoginWidget = function (selector, options) {
        options = options || {};
        this.base_url = options.base_url || utils.get_body_data("baseUrl");
        this.selector = selector;
        if (this.selector !== undefined) {
            this.element = $(selector);
            this.bind_events();
        }
    };


    LoginWidget.prototype.bind_events = function () {
        var that = this;
        this.element.find("button#logout").click(function () {
            window.location = utils.url_join_encode(
                that.base_url,
                "logout"
            );
        });
        this.element.find("button#login").click(function () {
            window.location = utils.url_join_encode(
                that.base_url,
                "login"
            );
        });
    };

    exports.LoginWidget = LoginWidget;

},{"base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/auth/js/logoutmain.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

    var IPython = require('base/js/namespace');
    var page = require('base/js/page');

    module.exports = function logoutMain() {
        var page_instance = new page.Page();
        page_instance.show();

        IPython.page = page_instance;
    };

},{"base/js/namespace":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/namespace.js","base/js/page":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/page.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/auth/js/main.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

exports.login_main = require('./loginmain');
exports.logout_main = require('./logoutmain');

},{"./loginmain":"/Users/jon/jupyter/notebook/notebook/static-src/auth/js/loginmain.js","./logoutmain":"/Users/jon/jupyter/notebook/notebook/static-src/auth/js/logoutmain.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/base/js/dialog.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

    "use strict";
    
    /**
     * A wrapper around bootstrap modal for easier use
     * Pass it an option dictionary with the following properties:
     *
     *    - body : <string> or <DOM node>, main content of the dialog
     *            if pass a <string> it will be wrapped in a p tag and
     *            html element escaped, unless you specify sanitize=false
     *            option.
     *    - title : Dialog title, default to empty string.
     *    - buttons : dict of btn_options who keys are button label.
     *            see btn_options below for description
     *    - open : callback to trigger on dialog open.
     *    - destroy:
     *    - notebook : notebook instance
     *    - keyboard_manager: keyboard manager instance.
     *
     *  Unlike bootstrap modals, the backdrop options is set by default 
     *  to 'static'.
     *
     *  The rest of the options are passed as is to bootstrap modals. 
     *
     *  btn_options: dict with the following property:
     *  
     *    - click : callback to trigger on click
     *    - class : css classes to add to button.
     *
     *
     *
     **/
    var modal = function (options) {
        var modal = $("<div/>")
            .addClass("modal")
            .addClass("fade")
            .attr("role", "dialog");
        var dialog = $("<div/>")
            .addClass("modal-dialog")
            .appendTo(modal);
        var dialog_content = $("<div/>")
            .addClass("modal-content")
            .appendTo(dialog);
        if(typeof(options.body) === 'string' && options.sanitize !== false){
            options.body = $("<p/>").text(options.body);
        }
        dialog_content.append(
            $("<div/>")
                .addClass("modal-header")
                .append($("<button>")
                    .attr("type", "button")
                    .addClass("close")
                    .attr("data-dismiss", "modal")
                    .attr("aria-hidden", "true")
                    .html("&times;")
                ).append(
                    $("<h4/>")
                        .addClass('modal-title')
                        .text(options.title || "")
                )
        ).append(
            $("<div/>").addClass("modal-body").append(
                options.body || $("<p/>")
            )
        );
        
        var footer = $("<div/>").addClass("modal-footer");
        
        for (var label in options.buttons) {
            var btn_opts = options.buttons[label];
            var button = $("<button/>")
                .addClass("btn btn-default btn-sm")
                .attr("data-dismiss", "modal")
                .text(label);
            if (btn_opts.click) {
                button.click($.proxy(btn_opts.click, dialog_content));
            }
            if (btn_opts.class) {
                button.addClass(btn_opts.class);
            }
            footer.append(button);
        }
        dialog_content.append(footer);
        // hook up on-open event
        modal.on("shown.bs.modal", function() {
            setTimeout(function() {
                footer.find("button").last().focus();
                if (options.open) {
                    $.proxy(options.open, modal)();
                }
            }, 0);
        });
        
        // destroy modal on hide, unless explicitly asked not to
        if (options.destroy === undefined || options.destroy) {
            modal.on("hidden.bs.modal", function () {
                modal.remove();
            });
        }
        modal.on("hidden.bs.modal", function () {
            if (options.notebook) {
                var cell = options.notebook.get_selected_cell();
                if (cell) cell.select();
            }
            if (options.keyboard_manager) {
                options.keyboard_manager.enable();
                options.keyboard_manager.command_mode();
            }
        });
        
        if (options.keyboard_manager) {
            options.keyboard_manager.disable();
        }
        
        if(options.backdrop === undefined){
          options.backdrop = 'static';
        }
        
        return modal.modal(options);
    };

    var kernel_modal = function (options) {
        /**
         * only one kernel dialog should be open at a time -- but
         * other modal dialogs can still be open
         */
        $('.kernel-modal').modal('hide');
        var dialog = modal(options);
        dialog.addClass('kernel-modal');
        return dialog;
    };

    var edit_metadata = function (options) {
        options.name = options.name || "Cell";
        var error_div = $('<div/>').css('color', 'red');
        var message = 
            "Manually edit the JSON below to manipulate the metadata for this " + options.name + "." +
            " We recommend putting custom metadata attributes in an appropriately named sub-structure," +
            " so they don't conflict with those of others.";

        var textarea = $('<textarea/>')
            .attr('rows', '13')
            .attr('cols', '80')
            .attr('name', 'metadata')
            .text(JSON.stringify(options.md || {}, null, 2));
        
        var dialogform = $('<div/>').attr('title', 'Edit the metadata')
            .append(
                $('<form/>').append(
                    $('<fieldset/>').append(
                        $('<label/>')
                        .attr('for','metadata')
                        .text(message)
                        )
                        .append(error_div)
                        .append($('<br/>'))
                        .append(textarea)
                    )
            );
        var editor = CodeMirror.fromTextArea(textarea[0], {
            lineNumbers: true,
            matchBrackets: true,
            indentUnit: 2,
            autoIndent: true,
            mode: 'application/json',
        });
        var modal_obj = modal({
            title: "Edit " + options.name + " Metadata",
            body: dialogform,
            buttons: {
                OK: { class : "btn-primary",
                    click: function() {
                        /**
                         * validate json and set it
                         */
                        var new_md;
                        try {
                            new_md = JSON.parse(editor.getValue());
                        } catch(e) {
                            console.log(e);
                            error_div.text('WARNING: Could not save invalid JSON.');
                            return false;
                        }
                        options.callback(new_md);
                    }
                },
                Cancel: {}
            },
            notebook: options.notebook,
            keyboard_manager: options.keyboard_manager,
        });

        modal_obj.on('shown.bs.modal', function(){ editor.refresh(); });
            
    };

    module.exports = {
        modal : modal,
        kernel_modal : kernel_modal,
        edit_metadata : edit_metadata,
    };

},{}],"/Users/jon/jupyter/notebook/notebook/static-src/base/js/events.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Give us an object to bind all events to. This object should be created
// before all other objects so it exists when others register event handlers.
// To register an event handler:
//
// require(['base/js/events'], function (events) {
//     events.on("event.Namespace", function () { do_stuff(); });
// });
"use strict";

if (!window.jupyterEvents) {
    var Events = function () {};
    window.jupyterEvents = $([new Events()]);
}

module.exports = window.jupyterEvents;

},{}],"/Users/jon/jupyter/notebook/notebook/static-src/base/js/keyboard.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 *
 *
 * @module keyboard
 * @namespace keyboard
 * @class ShortcutManager
 */

    "use strict";

    var utils = require('base/js/utils');


    /**
     * Setup global keycodes and inverse keycodes.
     *
     * See http://unixpapa.com/js/key.html for a complete description. The short of
     * it is that there are different keycode sets. Firefox uses the "Mozilla keycodes"
     * and Webkit/IE use the "IE keycodes". These keycode sets are mostly the same
     * but have minor differences.
     **/

     // These apply to Firefox, (Webkit and IE)
     // This does work **only** on US keyboard.
    var _keycodes = {
        'a': 65, 'b': 66, 'c': 67, 'd': 68, 'e': 69, 'f': 70, 'g': 71, 'h': 72, 'i': 73,
        'j': 74, 'k': 75, 'l': 76, 'm': 77, 'n': 78, 'o': 79, 'p': 80, 'q': 81, 'r': 82,
        's': 83, 't': 84, 'u': 85, 'v': 86, 'w': 87, 'x': 88, 'y': 89, 'z': 90,
        '1 !': 49, '2 @': 50, '3 #': 51, '4 $': 52, '5 %': 53, '6 ^': 54,
        '7 &': 55, '8 *': 56, '9 (': 57, '0 )': 48, 
        '[ {': 219, '] }': 221, '` ~': 192,  ', <': 188, '. >': 190, '/ ?': 191,
        '\\ |': 220, '\' "': 222,
        'numpad0': 96, 'numpad1': 97, 'numpad2': 98, 'numpad3': 99, 'numpad4': 100,
        'numpad5': 101, 'numpad6': 102, 'numpad7': 103, 'numpad8': 104, 'numpad9': 105,
        'multiply': 106, 'add': 107, 'subtract': 109, 'decimal': 110, 'divide': 111,
        'f1': 112, 'f2': 113, 'f3': 114, 'f4': 115, 'f5': 116, 'f6': 117, 'f7': 118,
        'f8': 119, 'f9': 120, 'f11': 122, 'f12': 123, 'f13': 124, 'f14': 125, 'f15': 126,
        'backspace': 8, 'tab': 9, 'enter': 13, 'shift': 16, 'ctrl': 17, 'alt': 18,
        'meta': 91, 'capslock': 20, 'esc': 27, 'space': 32, 'pageup': 33, 'pagedown': 34,
        'end': 35, 'home': 36, 'left': 37, 'up': 38, 'right': 39, 'down': 40,
        'insert': 45, 'delete': 46, 'numlock': 144,
    };

    // These apply to Firefox and Opera
    var _mozilla_keycodes = {
        '; :': 59, '= +': 61, '- _': 173, 'meta': 224, 'minus':173
    };

    // This apply to Webkit and IE
    var _ie_keycodes = {
        '; :': 186, '= +': 187, '- _': 189, 'minus':189
    };

    var browser = utils.browser[0];
    var platform = utils.platform;

    if (browser === 'Firefox' || browser === 'Opera' || browser === 'Netscape') {
        $.extend(_keycodes, _mozilla_keycodes);
    } else if (browser === 'Safari' || browser === 'Chrome' || browser === 'MSIE') {
        $.extend(_keycodes, _ie_keycodes);
    }

    var keycodes = {};
    var inv_keycodes = {};
    for (var name in _keycodes) {
        var names = name.split(' ');
        if (names.length === 1) {
            var n = names[0];
            keycodes[n] = _keycodes[n];
            inv_keycodes[_keycodes[n]] = n;
        } else {
            var primary = names[0];
            var secondary = names[1];
            keycodes[primary] = _keycodes[name];
            keycodes[secondary] = _keycodes[name];
            inv_keycodes[_keycodes[name]] = primary;
        }
    }

    var normalize_key = function (key) {
        return inv_keycodes[keycodes[key]];
    };

    var normalize_shortcut = function (shortcut) {
        /**
         * @function _normalize_shortcut
         * @private
         * return a dict containing the normalized shortcut and the number of time it should be pressed:
         *
         * Put a shortcut into normalized form:
         * 1. Make lowercase
         * 2. Replace cmd by meta
         * 3. Sort '-' separated modifiers into the order alt-ctrl-meta-shift
         * 4. Normalize keys
         **/
        if (platform === 'MacOS') {
            shortcut = shortcut.toLowerCase().replace('cmdtrl-', 'cmd-');
        } else {
            shortcut = shortcut.toLowerCase().replace('cmdtrl-', 'ctrl-');
        }

        shortcut = shortcut.toLowerCase().replace('cmd', 'meta');
        shortcut = shortcut.replace(/-$/, 'minus');  // catch shortcuts using '-' key
        shortcut = shortcut.replace(/,$/, 'comma');  // catch shortcuts using '-' key
        if(shortcut.indexOf(',') !== -1){
            var sht = shortcut.split(',');
            sht = _.map(sht, normalize_shortcut);
            return shortcut;
        }
        shortcut = shortcut.replace(/comma/g, ',');  // catch shortcuts using '-' key
        var values = shortcut.split("-");
        if (values.length === 1) {
            return normalize_key(values[0]);
        } else {
            var modifiers = values.slice(0,-1);
            var key = normalize_key(values[values.length-1]);
            modifiers.sort();
            return modifiers.join('-') + '-' + key;
        }
    };

    var shortcut_to_event = function (shortcut, type) {
        /**
         * Convert a shortcut (shift-r) to a jQuery Event object
         **/
        type = type || 'keydown';
        shortcut = normalize_shortcut(shortcut);
        shortcut = shortcut.replace(/-$/, 'minus');  // catch shortcuts using '-' key
        var values = shortcut.split("-");
        var modifiers = values.slice(0,-1);
        var key = values[values.length-1];
        var opts = {which: keycodes[key]};
        if (modifiers.indexOf('alt') !== -1) {opts.altKey = true;}
        if (modifiers.indexOf('ctrl') !== -1) {opts.ctrlKey = true;}
        if (modifiers.indexOf('meta') !== -1) {opts.metaKey = true;}
        if (modifiers.indexOf('shift') !== -1) {opts.shiftKey = true;}
        return $.Event(type, opts);
    };

    var only_modifier_event = function(event){
        /**
         * Return `true` if the event only contains modifiers keys.
         * false otherwise
         **/
        var key = inv_keycodes[event.which];
        return ((event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) &&
         (key === 'alt'|| key === 'ctrl'|| key === 'meta'|| key === 'shift'));

    };

    var event_to_shortcut = function (event) {
        /**
         * Convert a jQuery Event object to a normalized shortcut string (shift-r)
         **/
        var shortcut = '';
        var key = inv_keycodes[event.which];
        if (event.altKey && key !== 'alt') {shortcut += 'alt-';}
        if (event.ctrlKey && key !== 'ctrl') {shortcut += 'ctrl-';}
        if (event.metaKey && key !== 'meta') {shortcut += 'meta-';}
        if (event.shiftKey && key !== 'shift') {shortcut += 'shift-';}
        shortcut += key;
        return shortcut;
    };

    // Shortcut manager class

    var ShortcutManager = function (delay, events, actions, env) {
        /**
         * A class to deal with keyboard event and shortcut
         *
         * @class ShortcutManager
         * @constructor
         */
        this._shortcuts = {};
        this.delay = delay || 800; // delay in milliseconds
        this.events = events;
        this.actions = actions;
        this.actions.extend_env(env);
        this._queue = [];
        this._cleartimeout = null;
        Object.seal(this);
    };

    ShortcutManager.prototype.clearsoon = function(){
        /**
         * Clear the pending shortcut soon, and cancel previous clearing
         * that might be registered.
         **/
         var that = this;
         clearTimeout(this._cleartimeout);
         this._cleartimeout = setTimeout(function(){that.clearqueue();}, this.delay);
    };


    ShortcutManager.prototype.clearqueue = function(){
        /**
         * clear the pending shortcut sequence now. 
         **/
        this._queue = [];
        clearTimeout(this._cleartimeout);
    };


    var flatten_shorttree = function(tree){
        /**
         * Flatten a tree of shortcut sequences. 
         * use full to iterate over all the key/values of available shortcuts.
         **/
        var  dct = {};
        for(var key in tree){
            var value = tree[key];
            if(typeof(value) === 'string'){
                dct[key] = value;
            } else {
                var ftree=flatten_shorttree(value);
                for(var subkey in ftree){
                    dct[key+','+subkey] = ftree[subkey];
                }
            } 
        }
        return dct;
    };
    
    ShortcutManager.prototype.get_action_shortcut = function(name){
      var ftree = flatten_shorttree(this._shortcuts);
      var res = {};
      for (var sht in ftree ){
        if(ftree[sht] === name){
          return sht;
        }
      }
      return undefined;
    };

    ShortcutManager.prototype.help = function () {
        var help = [];
        var ftree = flatten_shorttree(this._shortcuts);
        for (var shortcut in ftree) {
            var action = this.actions.get(ftree[shortcut]);
            var help_string = action.help||'== no help ==';
            var help_index = action.help_index;
            if (help_string) {
                var shortstring = (action.shortstring||shortcut);
                help.push({
                    shortcut: shortstring,
                    help: help_string,
                    help_index: help_index}
                );
            }
        }
        help.sort(function (a, b) {
            if (a.help_index === b.help_index) {
                return 0;
            }
            if (a.help_index === undefined || a.help_index > b.help_index){
                return 1;
            }
            return -1;
        });
        return help;
    };

    ShortcutManager.prototype.clear_shortcuts = function () {
        this._shortcuts = {};
    };

    ShortcutManager.prototype.get_shortcut = function (shortcut){
        /**
         * return a node of the shortcut tree which an action name (string) if leaf,
         * and an object with `object.subtree===true`
         **/
        if(typeof(shortcut) === 'string'){
            shortcut = shortcut.split(',');
        }
        
        return this._get_leaf(shortcut, this._shortcuts);
    };


    ShortcutManager.prototype._get_leaf = function(shortcut_array, tree){
        /**
         * @private
         * find a leaf/node in a subtree of the keyboard shortcut
         *
         **/
        if(shortcut_array.length === 1){
            return tree[shortcut_array[0]];
        } else if(  typeof(tree[shortcut_array[0]]) !== 'string'){
            return this._get_leaf(shortcut_array.slice(1), tree[shortcut_array[0]]);
        }
        return null;
    };

    ShortcutManager.prototype.set_shortcut = function( shortcut, action_name){
        if( typeof(action_name) !== 'string'){throw new Error('action is not a string', action_name);}
        if( typeof(shortcut) === 'string'){
            shortcut = shortcut.split(',');
        }
        return this._set_leaf(shortcut, action_name, this._shortcuts);
    };

    ShortcutManager.prototype._is_leaf = function(shortcut_array, tree){
        if(shortcut_array.length === 1){
           return(typeof(tree[shortcut_array[0]]) === 'string');
        } else {
            var subtree = tree[shortcut_array[0]];
            return this._is_leaf(shortcut_array.slice(1), subtree );
        }
    };

    ShortcutManager.prototype._remove_leaf = function(shortcut_array, tree, allow_node){
        if(shortcut_array.length === 1){
            var current_node = tree[shortcut_array[0]];
            if(typeof(current_node) === 'string'){
                delete tree[shortcut_array[0]];
            } else {
                throw('try to delete non-leaf');
            }
        } else {
            this._remove_leaf(shortcut_array.slice(1),  tree[shortcut_array[0]], allow_node);
            if(_.keys(tree[shortcut_array[0]]).length === 0){
                delete tree[shortcut_array[0]];
            }
        }
    };

    ShortcutManager.prototype._set_leaf = function(shortcut_array, action_name, tree){
        var current_node = tree[shortcut_array[0]];
        if(shortcut_array.length === 1){
            if(current_node !== undefined && typeof(current_node) !== 'string'){
                console.warn('[warning], you are overriting a long shortcut with a shorter one');
            }
            tree[shortcut_array[0]] = action_name;
            return true;
        } else {
            if(typeof(current_node) === 'string'){
                console.warn('you are trying to set a shortcut that will be shadowed'+
                             'by a more specific one. Aborting for :', action_name, 'the follwing '+
                             'will take precedence', current_node);
                return false;
            } else {
                tree[shortcut_array[0]] = tree[shortcut_array[0]]||{};
            }
            this._set_leaf(shortcut_array.slice(1), action_name, tree[shortcut_array[0]]);
            return true;
        }
    };

    ShortcutManager.prototype.add_shortcut = function (shortcut, data, suppress_help_update) {
        /**
         * Add a action to be handled by shortcut manager. 
         * 
         * - `shortcut` should be a `Shortcut Sequence` of the for `Ctrl-Alt-C,Meta-X`...
         * - `data` could be an `action name`, an `action` or a `function`.
         *   if a `function` is passed it will be converted to an anonymous `action`. 
         *
         **/
        var action_name = this.actions.get_name(data);
        if (! action_name){
          throw new Error('does not know how to deal with', data);
        }
        shortcut = normalize_shortcut(shortcut);
        this.set_shortcut(shortcut, action_name);

        if (!suppress_help_update) {
            // update the keyboard shortcuts notebook help
            this.events.trigger('rebuild.QuickHelp');
        }
    };

    ShortcutManager.prototype.add_shortcuts = function (data) {
        /**
         * Convenient methods to call `add_shortcut(key, value)` on several items
         * 
         *  data : Dict of the form {key:value, ...}
         **/
        for (var shortcut in data) {
            this.add_shortcut(shortcut, data[shortcut], true);
        }
        // update the keyboard shortcuts notebook help
        this.events.trigger('rebuild.QuickHelp');
    };

    ShortcutManager.prototype.remove_shortcut = function (shortcut, suppress_help_update) {
        /**
         * Remove the binding of shortcut `sortcut` with its action.
         * throw an error if trying to remove a non-exiting shortcut
         **/
        shortcut = normalize_shortcut(shortcut);
        if( typeof(shortcut) === 'string'){
            shortcut = shortcut.split(',');
        }
        /*
         *  The shortcut error should be explicit here, because it will be
         *  seen by users.
         */
        try
        {
          this._remove_leaf(shortcut, this._shortcuts);
          if (!suppress_help_update) {
            // update the keyboard shortcuts notebook help
            this.events.trigger('rebuild.QuickHelp');
          }
        } catch (ex) {
          throw new Error('trying to remove a non-existent shortcut', shortcut);
        }
    };



    ShortcutManager.prototype.call_handler = function (event) {
        /**
         * Call the corresponding shortcut handler for a keyboard event
         * @method call_handler
         * @return {Boolean} `true|false`, `false` if no handler was found, otherwise the  value return by the handler. 
         * @param event {event}
         *
         * given an event, call the corresponding shortcut. 
         * return false is event wan handled, true otherwise 
         * in any case returning false stop event propagation
         **/


        this.clearsoon();
        if(only_modifier_event(event)){
            return true;
        }
        var shortcut = event_to_shortcut(event);
        this._queue.push(shortcut);
        var action_name = this.get_shortcut(this._queue);

        if (typeof(action_name) === 'undefined'|| action_name === null){
            this.clearqueue();
            return true;
        }
        
        if (this.actions.exists(action_name)) {
            event.preventDefault();
            this.clearqueue();
            return this.actions.call(action_name, event);
        }

        return false;
    };


    ShortcutManager.prototype.handles = function (event) {
        var shortcut = event_to_shortcut(event);
        var action_name = this.get_shortcut(this._queue.concat(shortcut));
        return (typeof(action_name) !== 'undefined');
    };

    module.exports = {
        keycodes : keycodes,
        inv_keycodes : inv_keycodes,
        ShortcutManager : ShortcutManager,
        normalize_key : normalize_key,
        normalize_shortcut : normalize_shortcut,
        shortcut_to_event : shortcut_to_event,
        event_to_shortcut : event_to_shortcut,
    };

},{"base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/base/js/namespace.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

"use strict";

if (!window.Jupyter) {
    var Jupyter = {};
    Jupyter.version = "4.1.0.dev";
    window.Jupyter = Jupyter;
}

var jprop = function(name, loaded, module_path, global_mod) {
    if (!(window.Jupyter).hasOwnProperty(name)) {
        Object.defineProperty(window.Jupyter, name, {
            get: function() {
                console.warn('accessing `'+name+'` is deprecated. Use `require(\'' + module_path + '\')' + (global_mod ? '[\'' + name + '\']' : '') + '`');
                return global_mod ? loaded[name] : loaded; 
            },
            enumerable: true,
            configurable: false
        });    
    }
};

// expose modules
jprop('events', require('base/js/events'), 'base/js/events');
jprop('utils', require('base/js/utils'), 'base/js/utils');
jprop('security', require('base/js/security'), 'base/js/security');
jprop('keyboard', require('base/js/keyboard'), 'base/js/keyboard');
jprop('dialog', require('base/js/dialog'), 'base/js/dialog');
jprop('mathjaxutils', require('notebook/js/mathjaxutils'), 'notebook/js/mathjaxutils');

//// exposed constructors
jprop('CommManager', require('services/kernels/comm'), 'services/kernels/comm', true);
jprop('Comm', require('services/kernels/comm'), 'services/kernels/comm', true);

jprop('NotificationWidget', require('base/js/notificationwidget'), 'base/js/notificationwidget', true);
jprop('Kernel', require('services/kernels/kernel'), 'services/kernels/kernel', true);
jprop('Session', require('services/sessions/session'), 'services/sessions/session', true);
jprop('LoginWidget', require('auth/js/loginwidget'), 'auth/js/loginwidget', true);
jprop('Page', require('base/js/page'), 'base/js/page', true);

// notebook
jprop('TextCell', require('notebook/js/textcell'), 'notebook/js/textcell', true);
jprop('OutputArea', require('notebook/js/outputarea'), 'notebook/js/outputarea', true);
jprop('KeyboardManager', require('notebook/js/keyboardmanager'), 'notebook/js/keyboardmanager', true);
jprop('Completer', require('notebook/js/completer'), 'notebook/js/completer', true);
jprop('Notebook', require('notebook/js/notebook'), 'notebook/js/notebook', true);
jprop('Tooltip', require('notebook/js/tooltip'), 'notebook/js/tooltip', true);
jprop('ToolBar', require('notebook/js/toolbar'), 'notebook/js/toolbar', true);
jprop('SaveWidget', require('notebook/js/savewidget'), 'notebook/js/savewidget', true);
jprop('Pager', require('notebook/js/pager'), 'notebook/js/pager', true);
jprop('QuickHelp', require('notebook/js/quickhelp'), 'notebook/js/quickhelp', true);
jprop('MarkdownCell', require('notebook/js/textcell'), 'notebook/js/textcell', true);
jprop('RawCell', require('notebook/js/textcell'), 'notebook/js/textcell', true);
jprop('Cell', require('notebook/js/cell'), 'notebook/js/cell', true);
jprop('MainToolBar', require('notebook/js/maintoolbar'), 'notebook/js/maintoolbar', true);
jprop('NotebookNotificationArea', require('notebook/js/notificationarea'), 'notebook/js/notificationarea', true);
jprop('NotebookTour', require( 'notebook/js/tour'),  'notebook/js/tour', true);
jprop('MenuBar', require( 'notebook/js/menubar'),  'notebook/js/menubar', true);

// tree
jprop('SessionList', require('tree/js/sessionlist'), 'tree/js/sessionlist', true);

window.Jupyter._target = '_blank';

// deprecated since 4.0, remove in 5+
window.IPython = window.Jupyter;
    
module.exports = window.Jupyter;

},{"auth/js/loginwidget":"/Users/jon/jupyter/notebook/notebook/static-src/auth/js/loginwidget.js","base/js/dialog":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/dialog.js","base/js/events":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/events.js","base/js/keyboard":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/keyboard.js","base/js/notificationwidget":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/notificationwidget.js","base/js/page":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/page.js","base/js/security":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/security.js","base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js","notebook/js/cell":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/cell.js","notebook/js/completer":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/completer.js","notebook/js/keyboardmanager":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/keyboardmanager.js","notebook/js/maintoolbar":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/maintoolbar.js","notebook/js/mathjaxutils":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/mathjaxutils.js","notebook/js/menubar":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/menubar.js","notebook/js/notebook":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/notebook.js","notebook/js/notificationarea":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/notificationarea.js","notebook/js/outputarea":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/outputarea.js","notebook/js/pager":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/pager.js","notebook/js/quickhelp":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/quickhelp.js","notebook/js/savewidget":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/savewidget.js","notebook/js/textcell":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/textcell.js","notebook/js/toolbar":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/toolbar.js","notebook/js/tooltip":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/tooltip.js","notebook/js/tour":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/tour.js","services/kernels/comm":"/Users/jon/jupyter/notebook/notebook/static-src/services/kernels/comm.js","services/kernels/kernel":"/Users/jon/jupyter/notebook/notebook/static-src/services/kernels/kernel.js","services/sessions/session":"/Users/jon/jupyter/notebook/notebook/static-src/services/sessions/session.js","tree/js/sessionlist":"/Users/jon/jupyter/notebook/notebook/static-src/tree/js/sessionlist.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/base/js/notificationarea.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

    "use strict";

    var notificationwidget = require('base/js/notificationwidget');

    // store reference to the NotificationWidget class
    var NotificationWidget = notificationwidget.NotificationWidget;

    /**
     * Construct the NotificationArea object. Options are:
     *     events: $(Events) instance
     *     save_widget: SaveWidget instance
     *     notebook: Notebook instance
     *     keyboard_manager: KeyboardManager instance
     *
     * @constructor
     * @param {string} selector - a jQuery selector string for the
     * notification area element
     * @param {Object} [options] - a dictionary of keyword arguments.
     */
    var NotificationArea = function (selector, options) {
        this.selector = selector;
        this.events = options.events;
        if (this.selector !== undefined) {
            this.element = $(selector);
        }
        this.widget_dict = {};
    };

    /**
     * Get a widget by name, creating it if it doesn't exist.
     *
     * @method widget
     * @param {string} name - the widget name
     */
    NotificationArea.prototype.widget = function (name) {
        if (this.widget_dict[name] === undefined) {
            return this.new_notification_widget(name);
        }
        return this.get_widget(name);
    };

    /**
     * Get a widget by name, throwing an error if it doesn't exist.
     *
     * @method get_widget
     * @param {string} name - the widget name
     */
    NotificationArea.prototype.get_widget = function (name) {
        if(this.widget_dict[name] === undefined) {
            throw('no widgets with this name');
        }
        return this.widget_dict[name];
    };

    /**
     * Create a new notification widget with the given name. The
     * widget must not already exist.
     *
     * @method new_notification_widget
     * @param {string} name - the widget name
     */
    NotificationArea.prototype.new_notification_widget = function (name) {
        if (this.widget_dict[name] !== undefined) {
            throw('widget with that name already exists!');
        }

        // create the element for the notification widget and add it
        // to the notification aread element
        var div = $('<div/>').attr('id', 'notification_' + name);
        $(this.selector).append(div);

        // create the widget object and return it
        this.widget_dict[name] = new NotificationWidget('#notification_' + name);
        return this.widget_dict[name];
    };

    exports.NotificationArea = NotificationArea;

},{"base/js/notificationwidget":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/notificationwidget.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/base/js/notificationwidget.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

    "use strict";

    /**
     * Construct a NotificationWidget object.
     *
     * @constructor
     * @param {string} selector - a jQuery selector string for the
     * notification widget element
     */
    var NotificationWidget = function (selector) {
        this.selector = selector;
        this.timeout = null;
        this.busy = false;
        if (this.selector !== undefined) {
            this.element = $(selector);
            this.style();
        }
        this.element.hide();
        this.inner = $('<span/>');
        this.element.append(this.inner);
    };

    /**
     * Add the 'notification_widget' CSS class to the widget element.
     *
     * @method style
     */
    NotificationWidget.prototype.style = function () {
        // use explicit bootstrap classes here,
        // because multiple inheritance in LESS doesn't work
        // for this particular combination
        this.element.addClass('notification_widget btn btn-xs navbar-btn');
    };

    /**
     * hide the widget and empty the text
     **/
    NotificationWidget.prototype.hide = function () {
        var that = this;
        this.element.fadeOut(100, function(){that.inner.text('');});
    };

    /**
     * Set the notification widget message to display for a certain
     * amount of time (timeout).  The widget will be shown forever if
     * timeout is <= 0 or undefined. If the widget is clicked while it
     * is still displayed, execute an optional callback
     * (click_callback). If the callback returns false, it will
     * prevent the notification from being dismissed.
     *
     * Options:
     *    class - CSS class name for styling
     *    icon - CSS class name for the widget icon
     *    title - HTML title attribute for the widget
     *
     * @method set_message
     * @param {string} msg - The notification to display
     * @param {integer} [timeout] - The amount of time in milliseconds to display the widget
     * @param {function} [click_callback] - The function to run when the widget is clicked
     * @param {Object} [options] - Additional options
     */
    NotificationWidget.prototype.set_message = function (msg, timeout, click_callback, options) {
        options = options || {};

        // unbind potential previous callback
        this.element.unbind('click');
        this.inner.attr('class', options.icon);
        this.inner.attr('title', options.title);
        this.inner.text(msg);
        this.element.fadeIn(100);

        // reset previous set style
        this.element.removeClass();
        this.style();
        if (options.class) {
            this.element.addClass(options.class);
        }

        // clear previous timer
        if (this.timeout !== null) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        // set the timer if a timeout is given
        var that = this;
        if (timeout !== undefined && timeout >= 0) {
            this.timeout = setTimeout(function () {
                that.element.fadeOut(100, function () {that.inner.text('');});
                that.element.unbind('click');
                that.timeout = null;
            }, timeout);
        }

        // if no click callback assume we will just dismiss the notification
        if (click_callback === undefined) {
            click_callback = function(){return true};
        }
        // on click, remove widget if click callback say so
        // and unbind click event.
        this.element.click(function () {
            if (click_callback() !== false) {
                that.element.fadeOut(100, function () {that.inner.text('');});
                that.element.unbind('click');
            }
            if (that.timeout !== null) {
                clearTimeout(that.timeout);
                that.timeout = null;
            }
        });
    };

    /**
     * Display an information message (styled with the 'info'
     * class). Arguments are the same as in set_message. Default
     * timeout is 3500 milliseconds.
     *
     * @method info
     */
    NotificationWidget.prototype.info = function (msg, timeout, click_callback, options) {
        options = options || {};
        options.class = options.class + ' info';
        timeout = timeout || 3500;
        this.set_message(msg, timeout, click_callback, options);
    };

    /**
     * Display a warning message (styled with the 'warning'
     * class). Arguments are the same as in set_message. Messages are
     * sticky by default.
     *
     * @method warning
     */
    NotificationWidget.prototype.warning = function (msg, timeout, click_callback, options) {
        options = options || {};
        options.class = options.class + ' warning';
        this.set_message(msg, timeout, click_callback, options);
    };

    /**
     * Display a danger message (styled with the 'danger'
     * class). Arguments are the same as in set_message. Messages are
     * sticky by default.
     *
     * @method danger
     */
    NotificationWidget.prototype.danger = function (msg, timeout, click_callback, options) {
        options = options || {};
        options.class = options.class + ' danger';
        this.set_message(msg, timeout, click_callback, options);
    };

    /**
     * Get the text of the widget message.
     *
     * @method get_message
     * @return {string} - the message text
     */
    NotificationWidget.prototype.get_message = function () {
        return this.inner.html();
    };

    exports.NotificationWidget = NotificationWidget;

},{}],"/Users/jon/jupyter/notebook/notebook/static-src/base/js/page.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

    "use strict";
        
    var events = require('base/js/events');

    var Page = function () {
        this.bind_events();
    };

    Page.prototype.bind_events = function () {
        // resize site on:
        // - window resize
        // - header change
        // - page load
        var _handle_resize = $.proxy(this._resize_site, this);
        
        $(window).resize(_handle_resize);

        // On document ready, resize codemirror.
        $(document).ready(_handle_resize);
        events.on('resize-header.Page', _handle_resize);
    };

    Page.prototype.show = function () {
        /**
         * The header and site divs start out hidden to prevent FLOUC.
         * Main scripts should call this method after styling everything.
         */
        this.show_header();
        this.show_site();
    };

    Page.prototype.show_header = function () {
        /**
         * The header and site divs start out hidden to prevent FLOUC.
         * Main scripts should call this method after styling everything.
         * TODO: selector are hardcoded, pass as constructor argument
         */
        $('div#header').css('display','block');
    };

    Page.prototype.show_site = function () {
        /**
         * The header and site divs start out hidden to prevent FLOUC.
         * Main scripts should call this method after styling everything.
         * TODO: selector are hardcoded, pass as constructor argument
         */
        $('div#site').css('display', 'block');
        this._resize_site();
    };

    Page.prototype._resize_site = function() {
        // Update the site's size.
        $('div#site').height($(window).height() - $('#header').height());
    };

    exports.Page = Page;

},{"base/js/events":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/events.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/base/js/security.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

    "use strict";
        
    var caja = require('google-caja/html-css-sanitizer-minified');

    var noop = function (x) { return x; };

    var caja;
    if (window && window.html) {
        caja = window.html;
        caja.html4 = window.html4;
        caja.sanitizeStylesheet = window.sanitizeStylesheet;
    }

    var sanitizeAttribs = function (tagName, attribs, opt_naiveUriRewriter, opt_nmTokenPolicy, opt_logger) {
        /**
         * add trusting data-attributes to the default sanitizeAttribs from caja
         * this function is mostly copied from the caja source
         */
        var ATTRIBS = caja.html4.ATTRIBS;
        for (var i = 0; i < attribs.length; i += 2) {
            var attribName = attribs[i];
            if (attribName.substr(0,5) == 'data-') {
                var attribKey = '*::' + attribName;
                if (!ATTRIBS.hasOwnProperty(attribKey)) {
                    ATTRIBS[attribKey] = 0;
                }
            }
        }
        return caja.sanitizeAttribs(tagName, attribs, opt_naiveUriRewriter, opt_nmTokenPolicy, opt_logger);
    };

    var sanitize_css = function (css, tagPolicy) {
        /**
         * sanitize CSS
         * like sanitize_html, but for CSS
         * called by sanitize_stylesheets
         */
        return caja.sanitizeStylesheet(
            window.location.pathname,
            css,
            {
                containerClass: null,
                idSuffix: '',
                tagPolicy: tagPolicy,
                virtualizeAttrName: noop
            },
            noop
        );
    };

    var sanitize_stylesheets = function (html, tagPolicy) {
        /**
         * sanitize just the css in style tags in a block of html
         * called by sanitize_html, if allow_css is true
         */
        var h = $("<div/>").append(html);
        var style_tags = h.find("style");
        if (!style_tags.length) {
            // no style tags to sanitize
            return html;
        }
        style_tags.each(function(i, style) {
            style.innerHTML = sanitize_css(style.innerHTML, tagPolicy);
        });
        return h.html();
    };

    var sanitize_html = function (html, allow_css) {
        /**
         * sanitize HTML
         * if allow_css is true (default: false), CSS is sanitized as well.
         * otherwise, CSS elements and attributes are simply removed.
         */
        var html4 = caja.html4;

        if (allow_css) {
            // allow sanitization of style tags,
            // not just scrubbing
            html4.ELEMENTS.style &= ~html4.eflags.UNSAFE;
            html4.ATTRIBS.style = html4.atype.STYLE;
        } else {
            // scrub all CSS
            html4.ELEMENTS.style |= html4.eflags.UNSAFE;
            html4.ATTRIBS.style = html4.atype.SCRIPT;
        }
        
        var record_messages = function (msg, opts) {
            console.log("HTML Sanitizer", msg, opts);
        };
        
        var policy = function (tagName, attribs) {
            if (!(html4.ELEMENTS[tagName] & html4.eflags.UNSAFE)) {
                return {
                    'attribs': sanitizeAttribs(tagName, attribs,
                        noop, noop, record_messages)
                    };
            } else {
                record_messages(tagName + " removed", {
                  change: "removed",
                  tagName: tagName
                });
            }
        };
        
        var sanitized = caja.sanitizeWithPolicy(html, policy);
        
        if (allow_css) {
            // sanitize style tags as stylesheets
            sanitized = sanitize_stylesheets(result.sanitized, policy);
        }
        
        return sanitized;
    };

    module.exports = {
        caja: caja,
        sanitize_html: sanitize_html
    };

},{"google-caja/html-css-sanitizer-minified":"/Users/jon/jupyter/notebook/notebook/static/components/google-caja/html-css-sanitizer-minified.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

    "use strict";
        
    var moment = require('moment');

    /**
     * Load a single extension.
     * @param  {string} extension - extension path.
     * @return {Promise} that resolves to an extension module handle
     */
    var load_extension = function (extension) {
        return new Promise(function(resolve, reject) {
            requirejs(["nbextensions/" + extension], function(module) {
                console.log("Loaded extension: " + extension);
                try {
                    module.load_ipython_extension();
                } finally {
                    resolve(module);
                }
            }, function(err) {
                reject(err);
            });
        });
    };

    /**
     * Load multiple extensions.
     * Takes n-args, where each arg is a string path to the extension.
     * @return {Promise} that resolves to a list of loaded module handles.
     */
    var load_extensions = function () {
        return Promise.all(Array.prototype.map.call(arguments, load_extension)).catch(function(err) {
            console.error("Failed to load extension" + (err.requireModules.length>1?'s':'') + ":", err.requireModules, err);
        });
    };

    /**
     * Wait for a config section to load, and then load the extensions specified
     * in a 'load_extensions' key inside it.
     */
    function load_extensions_from_config(section) {
        section.loaded.then(function() {
            if (section.data.load_extensions) {
                var nbextension_paths = Object.getOwnPropertyNames(
                                            section.data.load_extensions);
                load_extensions.apply(this, nbextension_paths);
            }
        });
    }

    //============================================================================
    // Cross-browser RegEx Split
    //============================================================================

    // This code has been MODIFIED from the code licensed below to not replace the
    // default browser split.  The license is reproduced here.

    // see http://blog.stevenlevithan.com/archives/cross-browser-split for more info:
    /*!
     * Cross-Browser Split 1.1.1
     * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
     * Available under the MIT License
     * ECMAScript compliant, uniform cross-browser split method
     */

    /**
     * Splits a string into an array of strings using a regex or string
     * separator. Matches of the separator are not included in the result array.
     * However, if `separator` is a regex that contains capturing groups,
     * backreferences are spliced into the result each time `separator` is
     * matched. Fixes browser bugs compared to the native
     * `String.prototype.split` and can be used reliably cross-browser.
     * @param {String} str String to split.
     * @param {RegExp} separator Regex to use for separating
     *     the string.
     * @param {Number} [limit] Maximum number of items to include in the result
     *     array.
     * @returns {Array} Array of substrings.
     * @example
     *
     * // Basic use
     * regex_split('a b c d', ' ');
     * // -> ['a', 'b', 'c', 'd']
     *
     * // With limit
     * regex_split('a b c d', ' ', 2);
     * // -> ['a', 'b']
     *
     * // Backreferences in result array
     * regex_split('..word1 word2..', /([a-z]+)(\d+)/i);
     * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
     */
    var regex_split = function (str, separator, limit) {
        var output = [],
            flags = (separator.ignoreCase ? "i" : "") +
                    (separator.multiline  ? "m" : "") +
                    (separator.extended   ? "x" : "") + // Proposed for ES6
                    (separator.sticky     ? "y" : ""), // Firefox 3+
            lastLastIndex = 0,
            separator2, match, lastIndex, lastLength;
        // Make `global` and avoid `lastIndex` issues by working with a copy
        separator = new RegExp(separator.source, flags + "g");

        var compliantExecNpcg = typeof(/()??/.exec("")[1]) === "undefined";
        if (!compliantExecNpcg) {
            // Doesn't need flags gy, but they don't hurt
            separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
        }
        /* Values for `limit`, per the spec:
         * If undefined: 4294967295 // Math.pow(2, 32) - 1
         * If 0, Infinity, or NaN: 0
         * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
         * If negative number: 4294967296 - Math.floor(Math.abs(limit))
         * If other: Type-convert, then use the above rules
         */
        limit = typeof(limit) === "undefined" ?
            -1 >>> 0 : // Math.pow(2, 32) - 1
            limit >>> 0; // ToUint32(limit)
        for (match = separator.exec(str); match; match = separator.exec(str)) {
            // `separator.lastIndex` is not reliable cross-browser
            lastIndex = match.index + match[0].length;
            if (lastIndex > lastLastIndex) {
                output.push(str.slice(lastLastIndex, match.index));
                // Fix browsers whose `exec` methods don't consistently return `undefined` for
                // nonparticipating capturing groups
                if (!compliantExecNpcg && match.length > 1) {
                    match[0].replace(separator2, function () {
                        for (var i = 1; i < arguments.length - 2; i++) {
                            if (typeof(arguments[i]) === "undefined") {
                                match[i] = undefined;
                            }
                        }
                    });
                }
                if (match.length > 1 && match.index < str.length) {
                    Array.prototype.push.apply(output, match.slice(1));
                }
                lastLength = match[0].length;
                lastLastIndex = lastIndex;
                if (output.length >= limit) {
                    break;
                }
            }
            if (separator.lastIndex === match.index) {
                separator.lastIndex++; // Avoid an infinite loop
            }
        }
        if (lastLastIndex === str.length) {
            if (lastLength || !separator.test("")) {
                output.push("");
            }
        } else {
            output.push(str.slice(lastLastIndex));
        }
        return output.length > limit ? output.slice(0, limit) : output;
    };

    //============================================================================
    // End contributed Cross-browser RegEx Split
    //============================================================================


    var uuid = function () {
        /**
         * http://www.ietf.org/rfc/rfc4122.txt
         */
        var s = [];
        var hexDigits = "0123456789ABCDEF";
        for (var i = 0; i < 32; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }
        s[12] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
        s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01

        var uuid = s.join("");
        return uuid;
    };


    //Fix raw text to parse correctly in crazy XML
    function xmlencode(string) {
        return string.replace(/\&/g,'&'+'amp;')
            .replace(/</g,'&'+'lt;')
            .replace(/>/g,'&'+'gt;')
            .replace(/\'/g,'&'+'apos;')
            .replace(/\"/g,'&'+'quot;')
            .replace(/`/g,'&'+'#96;');
    }


    //Map from terminal commands to CSS classes
    var ansi_colormap = {
        "01":"ansibold",
        
        "30":"ansiblack",
        "31":"ansired",
        "32":"ansigreen",
        "33":"ansiyellow",
        "34":"ansiblue",
        "35":"ansipurple",
        "36":"ansicyan",
        "37":"ansigray",
        
        "40":"ansibgblack",
        "41":"ansibgred",
        "42":"ansibggreen",
        "43":"ansibgyellow",
        "44":"ansibgblue",
        "45":"ansibgpurple",
        "46":"ansibgcyan",
        "47":"ansibggray"
    };

    function _process_numbers(attrs, numbers) {
        // process ansi escapes
        var n = numbers.shift();
        if (ansi_colormap[n]) {
            if ( ! attrs["class"] ) {
                attrs["class"] = ansi_colormap[n];
            } else {
                attrs["class"] += " " + ansi_colormap[n];
            }
        } else if (n == "38" || n == "48") {
            // VT100 256 color or 24 bit RGB
            if (numbers.length < 2) {
                console.log("Not enough fields for VT100 color", numbers);
                return;
            }
            
            var index_or_rgb = numbers.shift();
            var r,g,b;
            if (index_or_rgb == "5") {
                // 256 color
                var idx = parseInt(numbers.shift(), 10);
                if (idx < 16) {
                    // indexed ANSI
                    // ignore bright / non-bright distinction
                    idx = idx % 8;
                    var ansiclass = ansi_colormap[n[0] + (idx % 8).toString()];
                    if ( ! attrs["class"] ) {
                        attrs["class"] = ansiclass;
                    } else {
                        attrs["class"] += " " + ansiclass;
                    }
                    return;
                } else if (idx < 232) {
                    // 216 color 6x6x6 RGB
                    idx = idx - 16;
                    b = idx % 6;
                    g = Math.floor(idx / 6) % 6;
                    r = Math.floor(idx / 36) % 6;
                    // convert to rgb
                    r = (r * 51);
                    g = (g * 51);
                    b = (b * 51);
                } else {
                    // grayscale
                    idx = idx - 231;
                    // it's 1-24 and should *not* include black or white,
                    // so a 26 point scale
                    r = g = b = Math.floor(idx * 256 / 26);
                }
            } else if (index_or_rgb == "2") {
                // Simple 24 bit RGB
                if (numbers.length > 3) {
                    console.log("Not enough fields for RGB", numbers);
                    return;
                }
                r = numbers.shift();
                g = numbers.shift();
                b = numbers.shift();
            } else {
                console.log("unrecognized control", numbers);
                return;
            }
            if (r !== undefined) {
                // apply the rgb color
                var line;
                if (n == "38") {
                    line = "color: ";
                } else {
                    line = "background-color: ";
                }
                line = line + "rgb(" + r + "," + g + "," + b + ");";
                if ( !attrs.style ) {
                    attrs.style = line;
                } else {
                    attrs.style += " " + line;
                }
            }
        }
    }

    function ansispan(str) {
        // ansispan function adapted from github.com/mmalecki/ansispan (MIT License)
        // regular ansi escapes (using the table above)
        var is_open = false;
        return str.replace(/\033\[(0?[01]|22|39)?([;\d]+)?m/g, function(match, prefix, pattern) {
            if (!pattern) {
                // [(01|22|39|)m close spans
                if (is_open) {
                    is_open = false;
                    return "</span>";
                } else {
                    return "";
                }
            } else {
                is_open = true;

                // consume sequence of color escapes
                var numbers = pattern.match(/\d+/g);
                var attrs = {};
                while (numbers.length > 0) {
                    _process_numbers(attrs, numbers);
                }

                var span = "<span ";
                Object.keys(attrs).map(function (attr) {
                    span = span + " " + attr + '="' + attrs[attr] + '"';
                });
                return span + ">";
            }
        });
    }

    // Transform ANSI color escape codes into HTML <span> tags with css
    // classes listed in the above ansi_colormap object. The actual color used
    // are set in the css file.
    function fixConsole(txt) {
        txt = xmlencode(txt);

        // Strip all ANSI codes that are not color related.  Matches
        // all ANSI codes that do not end with "m".
        var ignored_re = /(?=(\033\[[\d;=]*[a-ln-zA-Z]{1}))\1(?!m)/g;
        txt = txt.replace(ignored_re, "");
        
        // color ansi codes
        txt = ansispan(txt);
        return txt;
    }

    // Remove chunks that should be overridden by the effect of
    // carriage return characters
    function fixCarriageReturn(txt) {
        var tmp = txt;
        do {
            txt = tmp;
            tmp = txt.replace(/\r+\n/gm, '\n'); // \r followed by \n --> newline
            tmp = tmp.replace(/^.*\r+/gm, '');  // Other \r --> clear line
        } while (tmp.length < txt.length);
        return txt;
    }

    // Locate any URLs and convert them to a anchor tag
    function autoLinkUrls(txt) {
        return txt.replace(/(^|\s)(https?|ftp)(:[^'">\s]+)/gi,
            "$1<a target=\"_blank\" href=\"$2$3\">$2$3</a>");
    }

    var points_to_pixels = function (points) {
        /**
         * A reasonably good way of converting between points and pixels.
         */
        var test = $('<div style="display: none; width: 10000pt; padding:0; border:0;"></div>');
        $('body').append(test);
        var pixel_per_point = test.width()/10000;
        test.remove();
        return Math.floor(points*pixel_per_point);
    };

    var always_new = function (constructor) {
        /**
         * wrapper around contructor to avoid requiring `var a = new constructor()`
         * useful for passing constructors as callbacks,
         * not for programmer laziness.
         * from http://programmers.stackexchange.com/questions/118798
         */
        return function () {
            var obj = Object.create(constructor.prototype);
            constructor.apply(obj, arguments);
            return obj;
        };
    };

    var url_path_join = function () {
        /**
         * join a sequence of url components with '/'
         */
        var url = '';
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] === '') {
                continue;
            }
            if (url.length > 0 && url[url.length-1] != '/') {
                url = url + '/' + arguments[i];
            } else {
                url = url + arguments[i];
            }
        }
        url = url.replace(/\/\/+/, '/');
        return url;
    };

    var url_path_split = function (path) {
        /**
         * Like os.path.split for URLs.
         * Always returns two strings, the directory path and the base filename
         */
        
        var idx = path.lastIndexOf('/');
        if (idx === -1) {
            return ['', path];
        } else {
            return [ path.slice(0, idx), path.slice(idx + 1) ];
        }
    };

    var parse_url = function (url) {
        /**
         * an `a` element with an href allows attr-access to the parsed segments of a URL
         * a = parse_url("http://localhost:8888/path/name#hash")
         * a.protocol = "http:"
         * a.host     = "localhost:8888"
         * a.hostname = "localhost"
         * a.port     = 8888
         * a.pathname = "/path/name"
         * a.hash     = "#hash"
         */
        var a = document.createElement("a");
        a.href = url;
        return a;
    };

    var encode_uri_components = function (uri) {
        /**
         * encode just the components of a multi-segment uri,
         * leaving '/' separators
         */
        return uri.split('/').map(encodeURIComponent).join('/');
    };

    var url_join_encode = function () {
        /**
         * join a sequence of url components with '/',
         * encoding each component with encodeURIComponent
         */
        return encode_uri_components(url_path_join.apply(null, arguments));
    };


    var splitext = function (filename) {
        /**
         * mimic Python os.path.splitext
         * Returns ['base', '.ext']
         */
        var idx = filename.lastIndexOf('.');
        if (idx > 0) {
            return [filename.slice(0, idx), filename.slice(idx)];
        } else {
            return [filename, ''];
        }
    };


    var escape_html = function (text) {
        /**
         * escape text to HTML
         */
        return $("<div/>").text(text).html();
    };


    var get_body_data = function(key) {
        /**
         * get a url-encoded item from body.data and decode it
         * we should never have any encoded URLs anywhere else in code
         * until we are building an actual request
         */
        var val = $('body').data(key);
        if (!val)
            return val;
        return decodeURIComponent(val);
    };

    var to_absolute_cursor_pos = function (cm, cursor) {
        /**
         * get the absolute cursor position from CodeMirror's col, ch
         */
        if (!cursor) {
            cursor = cm.getCursor();
        }
        var cursor_pos = cursor.ch;
        for (var i = 0; i < cursor.line; i++) {
            cursor_pos += cm.getLine(i).length + 1;
        }
        return cursor_pos;
    };

    var from_absolute_cursor_pos = function (cm, cursor_pos) {
        /**
         * turn absolute cursor position into CodeMirror col, ch cursor
         */
        var i, line, next_line;
        var offset = 0;
        for (i = 0, next_line=cm.getLine(i); next_line !== undefined; i++, next_line=cm.getLine(i)) {
            line = next_line;
            if (offset + next_line.length < cursor_pos) {
                offset += next_line.length + 1;
            } else {
                return {
                    line : i,
                    ch : cursor_pos - offset,
                };
            }
        }
        // reached end, return endpoint
        return {
            line : i - 1,
            ch : line.length - 1,
        };
    };

    // http://stackoverflow.com/questions/2400935/browser-detection-in-javascript
    var browser = (function() {
        if (typeof navigator === 'undefined') {
            // navigator undefined in node
            return 'None';
        }
        var N= navigator.appName, ua= navigator.userAgent, tem;
        var M= ua.match(/(opera|chrome|safari|firefox|msie)\/?\s*(\.?\d+(\.\d+)*)/i);
        if (M && (tem= ua.match(/version\/([\.\d]+)/i)) !== null) M[2]= tem[1];
        M= M? [M[1], M[2]]: [N, navigator.appVersion,'-?'];
        return M;
    })();

    // http://stackoverflow.com/questions/11219582/how-to-detect-my-browser-version-and-operating-system-using-javascript
    var platform = (function () {
        if (typeof navigator === 'undefined') {
            // navigator undefined in node
            return 'None';
        }
        var OSName="None";
        if (navigator.appVersion.indexOf("Win")!=-1) OSName="Windows";
        if (navigator.appVersion.indexOf("Mac")!=-1) OSName="MacOS";
        if (navigator.appVersion.indexOf("X11")!=-1) OSName="UNIX";
        if (navigator.appVersion.indexOf("Linux")!=-1) OSName="Linux";
        return OSName;
    })();

    var get_url_param = function (name) {
        // get a URL parameter. I cannot believe we actually need this.
        // Based on http://stackoverflow.com/a/25359264/938949
        var match = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
        if (match){
            return decodeURIComponent(match[1] || '');
        }
    };

    var is_or_has = function (a, b) {
        /**
         * Is b a child of a or a itself?
         */
        return a.has(b).length !==0 || a.is(b);
    };

    var is_focused = function (e) {
        /**
         * Is element e, or one of its children focused?
         */
        e = $(e);
        var target = $(document.activeElement);
        if (target.length > 0) {
            if (is_or_has(e, target)) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    };

    var mergeopt = function(_class, options, overwrite){
        options = options || {};
        overwrite = overwrite || {};
        return $.extend(true, {}, _class.options_default, options, overwrite);
    };

    var ajax_error_msg = function (jqXHR) {
        /**
         * Return a JSON error message if there is one,
         * otherwise the basic HTTP status text.
         */
        if (jqXHR.responseJSON && jqXHR.responseJSON.traceback) {
            return jqXHR.responseJSON.traceback;
        } else if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
            return jqXHR.responseJSON.message;
        } else {
            return jqXHR.statusText;
        }
    };
    var log_ajax_error = function (jqXHR, status, error) {
        /**
         * log ajax failures with informative messages
         */
        var msg = "API request failed (" + jqXHR.status + "): ";
        console.log(jqXHR);
        msg += ajax_error_msg(jqXHR);
        console.log(msg);
    };

    var requireCodeMirrorMode = function (mode, callback, errback) {
        /** 
         * find a predefined mode or detect from CM metadata then
         * require and callback with the resolveable mode string: mime or
         * custom name
         */

        var modename = (typeof mode == "string") ? mode :
            mode.mode || mode.name;

            
        // simplest, cheapest check by mode name: mode may also have config
        if (CodeMirror.modes.hasOwnProperty(modename)) {
            // return the full mode object, if it has a name
            callback(mode.name ? mode : modename);
            return;
        }

        // *somehow* get back a CM.modeInfo-like object that has .mode and
        // .mime
        var info = (mode && mode.mode && mode.mime && mode) ||
            CodeMirror.findModeByName(modename) ||
            CodeMirror.findModeByExtension(modename.split(".").slice(-1)) ||
            CodeMirror.findModeByMIME(modename) ||
            {mode: modename, mime: modename};

        requirejs([
                // might want to use CodeMirror.modeURL here
                ['codemirror/mode', info.mode, info.mode].join('/'),
            ], function() {
              // return the original mode, as from a kernelspec on first load
              // or the mimetype, as for most highlighting
              callback(mode.name ? mode : info.mime);
            }, errback
        );
    };

    /** Error type for wrapped XHR errors. */
    var XHR_ERROR = 'XhrError';

    /**
     * Wraps an AJAX error as an Error object.
     */
    var wrap_ajax_error = function (jqXHR, status, error) {
        var wrapped_error = new Error(ajax_error_msg(jqXHR));
        wrapped_error.name =  XHR_ERROR;
        // provide xhr response
        wrapped_error.xhr = jqXHR;
        wrapped_error.xhr_status = status;
        wrapped_error.xhr_error = error;
        return wrapped_error;
    };

    var promising_ajax = function(url, settings) {
        /**
         * Like $.ajax, but returning an ES6 promise. success and error settings
         * will be ignored.
         */
        settings = settings || {};
        return new Promise(function(resolve, reject) {
            settings.success = function(data, status, jqXHR) {
                resolve(data);
            };
            settings.error = function(jqXHR, status, error) {
                log_ajax_error(jqXHR, status, error);
                reject(wrap_ajax_error(jqXHR, status, error));
            };
            $.ajax(url, settings);
        });
    };

    var WrappedError = function(message, error){
        /**
         * Wrappable Error class
         *
         * The Error class doesn't actually act on `this`.  Instead it always
         * returns a new instance of Error.  Here we capture that instance so we
         * can apply it's properties to `this`.
         */
        var tmp = Error.apply(this, [message]);

        // Copy the properties of the error over to this.
        var properties = Object.getOwnPropertyNames(tmp);
        for (var i = 0; i < properties.length; i++) {
            this[properties[i]] = tmp[properties[i]];
        }

        // Keep a stack of the original error messages.
        if (error instanceof WrappedError) {
            this.error_stack = error.error_stack;
        } else {
            this.error_stack = [error];
        }
        this.error_stack.push(tmp);

        return this;
    };

    WrappedError.prototype = Object.create(Error.prototype, {});


    var load_class = function(class_name, module_name, registry) {
        /**
         * Tries to load a class
         *
         * Tries to load a class from a module using require.js, if a module 
         * is specified, otherwise tries to load a class from the global 
         * registry, if the global registry is provided.
         */
        return new Promise(function(resolve, reject) {

            // Try loading the view module using require.js
            if (module_name) {
                requirejs([module_name], function(module) {
                    if (module[class_name] === undefined) {
                        reject(new Error('Class '+class_name+' not found in module '+module_name));
                    } else {
                        resolve(module[class_name]);
                    }
                }, reject);
            } else {
                if (registry && registry[class_name]) {
                    resolve(registry[class_name]);
                } else {
                    reject(new Error('Class '+class_name+' not found in registry '));
                }
            }
        });
    };

    var resolve_promises_dict = function(d) {
        /**
         * Resolve a promiseful dictionary.
         * Returns a single Promise.
         */
        var keys = Object.keys(d);
        var values = [];
        keys.forEach(function(key) {
            values.push(d[key]);
        });
        return Promise.all(values).then(function(v) {
            d = {};
            for(var i=0; i<keys.length; i++) {
                d[keys[i]] = v[i];
            }
            return d;
        });
    };

    var reject = function(message, log) {
        /**
         * Creates a wrappable Promise rejection function.
         * 
         * Creates a function that returns a Promise.reject with a new WrappedError
         * that has the provided message and wraps the original error that 
         * caused the promise to reject.
         */
        return function(error) { 
            var wrapped_error = new WrappedError(message, error);
            if (log) console.error(wrapped_error); 
            return Promise.reject(wrapped_error); 
        };
    };

    var typeset = function(element, text) {
        /**
         * Apply MathJax rendering to an element, and optionally set its text
         *
         * If MathJax is not available, make no changes.
         *
         * Returns the output any number of typeset elements, or undefined if
         * MathJax was not available.
         *
         * Parameters
         * ----------
         * element: Node, NodeList, or jQuery selection
         * text: option string
         */
        var $el = element.jquery ? element : $(element);
        if(arguments.length > 1){
            $el.text(text);
        }
        if(!window.MathJax){
            return;
        }
        return $el.map(function(){
            // MathJax takes a DOM node: $.map makes `this` the context
            return MathJax.Hub.Queue(["Typeset", MathJax.Hub, this]);
        });
    };

    var time = {};
    time.milliseconds = {};
    time.milliseconds.s = 1000;
    time.milliseconds.m = 60 * time.milliseconds.s;
    time.milliseconds.h = 60 * time.milliseconds.m;
    time.milliseconds.d = 24 * time.milliseconds.h;

    time.thresholds = {
        // moment.js thresholds in milliseconds
        s: moment.relativeTimeThreshold('s') * time.milliseconds.s,
        m: moment.relativeTimeThreshold('m') * time.milliseconds.m,
        h: moment.relativeTimeThreshold('h') * time.milliseconds.h,
        d: moment.relativeTimeThreshold('d') * time.milliseconds.d,
    };

    time.timeout_from_dt = function (dt) {
        /** compute a timeout based on dt
        
        input and output both in milliseconds
        
        use moment's relative time thresholds:
        
        - 10 seconds if in 'seconds ago' territory
        - 1 minute if in 'minutes ago'
        - 1 hour otherwise
        */
        if (dt < time.thresholds.s) {
            return 10 * time.milliseconds.s;
        } else if (dt < time.thresholds.m) {
            return time.milliseconds.m;
        } else {
            return time.milliseconds.h;
        }
    };

    module.exports = {
        load_extension: load_extension,
        load_extensions: load_extensions,
        load_extensions_from_config: load_extensions_from_config,
        regex_split : regex_split,
        uuid : uuid,
        fixConsole : fixConsole,
        fixCarriageReturn : fixCarriageReturn,
        autoLinkUrls : autoLinkUrls,
        points_to_pixels : points_to_pixels,
        get_body_data : get_body_data,
        parse_url : parse_url,
        url_path_split : url_path_split,
        url_path_join : url_path_join,
        url_join_encode : url_join_encode,
        encode_uri_components : encode_uri_components,
        splitext : splitext,
        escape_html : escape_html,
        always_new : always_new,
        to_absolute_cursor_pos : to_absolute_cursor_pos,
        from_absolute_cursor_pos : from_absolute_cursor_pos,
        browser : browser,
        platform: platform,
        get_url_param: get_url_param,
        is_or_has : is_or_has,
        is_focused : is_focused,
        mergeopt: mergeopt,
        ajax_error_msg : ajax_error_msg,
        log_ajax_error : log_ajax_error,
        requireCodeMirrorMode : requireCodeMirrorMode,
        XHR_ERROR : XHR_ERROR,
        wrap_ajax_error : wrap_ajax_error,
        promising_ajax : promising_ajax,
        WrappedError: WrappedError,
        load_class: load_class,
        resolve_promises_dict: resolve_promises_dict,
        reject: reject,
        typeset: typeset,
        time: time,
    };

},{"moment":"/Users/jon/jupyter/notebook/node_modules/moment/moment.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/cell.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 *
 *
 * @module cell
 * @namespace cell
 * @class Cell
 */
    "use strict";

    var utils = require('base/js/utils');

    var overlayHack = CodeMirror.scrollbarModel.native.prototype.overlayHack;

    CodeMirror.scrollbarModel.native.prototype.overlayHack = function () {
        overlayHack.apply(this, arguments);
        // Reverse `min-height: 18px` scrollbar hack on OS X
        // which causes a dead area, making it impossible to click on the last line
        // when there is horizontal scrolling to do and the "show scrollbar only when scrolling" behavior
        // is enabled.
        // This, in turn, has the undesirable behavior of never showing the horizontal scrollbar,
        // even when it should, which is less problematic, at least.
        if (/Mac/.test(navigator.platform)) {
            this.horiz.style.minHeight = "";
        }
    };

    var Cell = function (options) {
        /* Constructor
         *
         * The Base `Cell` class from which to inherit.
         * @constructor
         * @param:
         *  options: dictionary
         *      Dictionary of keyword arguments.
         *          events: $(Events) instance
         *          config: dictionary
         *          keyboard_manager: KeyboardManager instance
         */
        options = options || {};
        this.keyboard_manager = options.keyboard_manager;
        this.events = options.events;
        var config = utils.mergeopt(Cell, options.config);
        // superclass default overwrite our default
        
        this.placeholder = config.placeholder || '';
        this.selected = false;
        this.in_selection = false;
        this.selection_anchor = false;
        this.rendered = false;
        this.mode = 'command';

        // Metadata property
        var that = this;
        this._metadata = {};
        Object.defineProperty(this, 'metadata', {
            get: function() { return that._metadata; },
            set: function(value) {
                that._metadata = value;
                if (that.celltoolbar) {
                    that.celltoolbar.rebuild();
                }
            }
        });

        // backward compat.
        Object.defineProperty(this, 'cm_config', {
            get: function() {
                console.warn("Warning: accessing Cell.cm_config directly is deprecate.")
                return that._options.cm_config;
            },
        });

        // load this from metadata later ?
        this.user_highlight = 'auto';


        var _local_cm_config = {};
        if(this.class_config){
            _local_cm_config = this.class_config.get_sync('cm_config');
        }
        config.cm_config = utils.mergeopt({}, config.cm_config, _local_cm_config);
        this.cell_id = utils.uuid();
        this._options = config;

        // For JS VM engines optimization, attributes should be all set (even
        // to null) in the constructor, and if possible, if different subclass
        // have new attributes with same name, they should be created in the
        // same order. Easiest is to create and set to null in parent class.

        this.element = null;
        this.cell_type = this.cell_type || null;
        this.code_mirror = null;

        this.create_element();
        if (this.element !== null) {
            this.element.data("cell", this);
            this.bind_events();
            this.init_classes();
        }
    };

    Cell.options_default = {
        cm_config : {
            indentUnit : 4,
            readOnly: false,
            theme: "default",
            extraKeys: {
                "Cmd-Right":"goLineRight",
                "End":"goLineRight",
                "Cmd-Left":"goLineLeft"
            }
        }
    };

    // FIXME: Workaround CM Bug #332 (Safari segfault on drag)
    // by disabling drag/drop altogether on Safari
    // https://github.com/codemirror/CodeMirror/issues/332    
    if (utils.browser[0] == "Safari") {
        Cell.options_default.cm_config.dragDrop = false;
    }

    /**
     * Empty. Subclasses must implement create_element.
     * This should contain all the code to create the DOM element in notebook
     * and will be called by Base Class constructor.
     * @method create_element
     */
    Cell.prototype.create_element = function () {
    };

    Cell.prototype.init_classes = function () {
        /**
         * Call after this.element exists to initialize the css classes
         * related to selected, rendered and mode.
         */
        if (this.in_selection) {
            this.element.addClass('selected');
        } else {
            this.element.addClass('unselected');
        }
        if (this.rendered) {
            this.element.addClass('rendered');
        } else {
            this.element.addClass('unrendered');
        }
    };

    /**
     * Subclasses can implement override bind_events.
     * Be carefull to call the parent method when overwriting as it fires event.
     * this will be triggerd after create_element in constructor.
     * @method bind_events
     */
    Cell.prototype.bind_events = function () {
        var that = this;
        // We trigger events so that Cell doesn't have to depend on Notebook.
        that.element.click(function (event) {
            if (!that.selected) {
                that.events.trigger('select.Cell', {'cell':that});
            }
        });
        that.element.focusin(function (event) {
            if (!that.selected) {
                that.events.trigger('select.Cell', {'cell':that});
            }
        });
        if (this.code_mirror) {
            this.code_mirror.on("change", function(cm, change) {
                that.events.trigger("set_dirty.Notebook", {value: true});
            });
        }
        if (this.code_mirror) {
            this.code_mirror.on('focus', function(cm, change) {
                that.events.trigger('edit_mode.Cell', {cell: that});
            });
        }
        if (this.code_mirror) {
            this.code_mirror.on('blur', function(cm, change) {
                that.events.trigger('command_mode.Cell', {cell: that});
            });
        }

        this.element.dblclick(function () {
            if (that.selected === false) {
                this.events.trigger('select.Cell', {'cell':that});
            }
            var cont = that.unrender();
            if (cont) {
                that.focus_editor();
            }
        });
    };

    /**
     * This method gets called in CodeMirror's onKeyDown/onKeyPress
     * handlers and is used to provide custom key handling.
     *
     * To have custom handling, subclasses should override this method, but still call it
     * in order to process the Edit mode keyboard shortcuts.
     *
     * @method handle_codemirror_keyevent
     * @param {CodeMirror} editor - The codemirror instance bound to the cell
     * @param {event} event - key press event which either should or should not be handled by CodeMirror
     * @return {Boolean} `true` if CodeMirror should ignore the event, `false` Otherwise
     */
    Cell.prototype.handle_codemirror_keyevent = function (editor, event) {
        var shortcuts = this.keyboard_manager.edit_shortcuts;

        var cur = editor.getCursor();
        if((cur.line !== 0 || cur.ch !==0) && event.keyCode === 38){
            event._ipkmIgnore = true;
        }
        var nLastLine = editor.lastLine();
        if ((event.keyCode === 40) &&
             ((cur.line !== nLastLine) ||
               (cur.ch !== editor.getLineHandle(nLastLine).text.length))
           ) {
            event._ipkmIgnore = true;
        }
        // if this is an edit_shortcuts shortcut, the global keyboard/shortcut
        // manager will handle it
        if (shortcuts.handles(event)) {
            return true;
        }
        
        return false;
    };


    /**
     * Triger typsetting of math by mathjax on current cell element
     * @method typeset
     */
    Cell.prototype.typeset = function () {
        utils.typeset(this.element);
    };

    /**
     * handle cell level logic when a cell is selected
     * @method select
     * @return is the action being taken
     */
    Cell.prototype.select = function () {
        if (!this.selected) {
            this.element.addClass('selected');
            this.element.removeClass('unselected');
            this.selected = true;
            this.in_selection = true;
            return true;
        } else {
            return false;
        }
    };

    /**
     * handle cell level logic when the cursor moves away from a cell
     * @method unselect
     * @param {bool} leave_selected - true to move cursor away and extend selection
     * @return is the action being taken
     */
    Cell.prototype.unselect = function (leave_selected) {
        var was_selected_cell = this.selected;
        this.selected = false;
        if ((!leave_selected) && this.in_selection) {
            this.in_selection = false;
            this.selection_anchor = false;
            this.element.addClass('unselected');
            this.element.removeClass('selected');
        }
        return was_selected_cell;
    };

    /**
     * should be overritten by subclass
     * @method execute
     */
    Cell.prototype.execute = function () {
        return;
    };

    /**
     * handle cell level logic when a cell is rendered
     * @method render
     * @return is the action being taken
     */
    Cell.prototype.render = function () {
        if (!this.rendered) {
            this.element.addClass('rendered');
            this.element.removeClass('unrendered');
            this.rendered = true;
            return true;
        } else {
            return false;
        }
    };

    /**
     * handle cell level logic when a cell is unrendered
     * @method unrender
     * @return is the action being taken
     */
    Cell.prototype.unrender = function () {
        if (this.rendered) {
            this.element.addClass('unrendered');
            this.element.removeClass('rendered');
            this.rendered = false;
            return true;
        } else {
            return false;
        }
    };

    /**
     * Delegates keyboard shortcut handling to either Jupyter keyboard
     * manager when in command mode, or CodeMirror when in edit mode
     *
     * @method handle_keyevent
     * @param {CodeMirror} editor - The codemirror instance bound to the cell
     * @param {event} - key event to be handled
     * @return {Boolean} `true` if CodeMirror should ignore the event, `false` Otherwise
     */
    Cell.prototype.handle_keyevent = function (editor, event) {
        if (this.mode === 'command') {
            return true;
        } else if (this.mode === 'edit') {
            return this.handle_codemirror_keyevent(editor, event);
        }
    };

    /**
     * @method at_top
     * @return {Boolean}
     */
    Cell.prototype.at_top = function () {
        var cm = this.code_mirror;
        var cursor = cm.getCursor();
        if (cursor.line === 0 && cursor.ch === 0) {
            return true;
        }
        return false;
    };

    /**
     * @method at_bottom
     * @return {Boolean}
     * */
    Cell.prototype.at_bottom = function () {
        var cm = this.code_mirror;
        var cursor = cm.getCursor();
        if (cursor.line === (cm.lineCount()-1) && cursor.ch === cm.getLine(cursor.line).length) {
            return true;
        }
        return false;
    };

    /**
     * enter the command mode for the cell
     * @method command_mode
     * @return is the action being taken
     */
    Cell.prototype.command_mode = function () {
        if (this.mode !== 'command') {
            this.mode = 'command';
            return true;
        } else {
            return false;
        }
    };

    /**
     * enter the edit mode for the cell
     * @method command_mode
     * @return is the action being taken
     */
    Cell.prototype.edit_mode = function () {
        if (this.mode !== 'edit') {
            this.mode = 'edit';
            return true;
        } else {
            return false;
        }
    };

    Cell.prototype.ensure_focused = function() {
        if(this.element !== document.activeElement && !this.code_mirror.hasFocus()){
            this.focus_cell();
        }
    }

    /**
     * Focus the cell in the DOM sense
     * @method focus_cell
     */
    Cell.prototype.focus_cell = function () {
        this.element.focus();
    };

    /**
     * Focus the editor area so a user can type
     *
     * NOTE: If codemirror is focused via a mouse click event, you don't want to
     * call this because it will cause a page jump.
     * @method focus_editor
     */
    Cell.prototype.focus_editor = function () {
        this.refresh();
        this.code_mirror.focus();
    };

    /**
     * Refresh codemirror instance
     * @method refresh
     */
    Cell.prototype.refresh = function () {
        if (this.code_mirror) {
            this.code_mirror.refresh();
        }
    };

    /**
     * should be overritten by subclass
     * @method get_text
     */
    Cell.prototype.get_text = function () {
    };

    /**
     * should be overritten by subclass
     * @method set_text
     * @param {string} text
     */
    Cell.prototype.set_text = function (text) {
    };

    /**
     * should be overritten by subclass
     * serialise cell to json.
     * @method toJSON
     **/
    Cell.prototype.toJSON = function () {
        var data = {};
        // deepcopy the metadata so copied cells don't share the same object
        data.metadata = JSON.parse(JSON.stringify(this.metadata));
        data.cell_type = this.cell_type;
        return data;
    };

    /**
     * should be overritten by subclass
     * @method fromJSON
     **/
    Cell.prototype.fromJSON = function (data) {
        if (data.metadata !== undefined) {
            this.metadata = data.metadata;
        }
    };


    /**
     * can the cell be split into two cells (false if not deletable)
     * @method is_splittable
     **/
    Cell.prototype.is_splittable = function () {
        return this.is_deletable();
    };


    /**
     * can the cell be merged with other cells (false if not deletable)
     * @method is_mergeable
     **/
    Cell.prototype.is_mergeable = function () {
        return this.is_deletable();
    };

    /**
     * is the cell deletable? only false (undeletable) if
     * metadata.deletable is explicitly false -- everything else
     * counts as true
     *
     * @method is_deletable
     **/
    Cell.prototype.is_deletable = function () {
        if (this.metadata.deletable === false) {
            return false;
        }
        return true;
    };

    /**
     * @return {String} - the text before the cursor
     * @method get_pre_cursor
     **/
    Cell.prototype.get_pre_cursor = function () {
        var cursor = this.code_mirror.getCursor();
        var text = this.code_mirror.getRange({line:0, ch:0}, cursor);
        text = text.replace(/^\n+/, '').replace(/\n+$/, '');
        return text;
    };


    /**
     * @return {String} - the text after the cursor
     * @method get_post_cursor
     **/
    Cell.prototype.get_post_cursor = function () {
        var cursor = this.code_mirror.getCursor();
        var last_line_num = this.code_mirror.lineCount()-1;
        var last_line_len = this.code_mirror.getLine(last_line_num).length;
        var end = {line:last_line_num, ch:last_line_len};
        var text = this.code_mirror.getRange(cursor, end);
        text = text.replace(/^\n+/, '').replace(/\n+$/, '');
        return text;
    };

    /**
     * Show/Hide CodeMirror LineNumber
     * @method show_line_numbers
     *
     * @param value {Bool}  show (true), or hide (false) the line number in CodeMirror
     **/
    Cell.prototype.show_line_numbers = function (value) {
        this.code_mirror.setOption('lineNumbers', value);
        this.code_mirror.refresh();
    };

    /**
     * Toggle  CodeMirror LineNumber
     * @method toggle_line_numbers
     **/
    Cell.prototype.toggle_line_numbers = function () {
        var val = this.code_mirror.getOption('lineNumbers');
        this.show_line_numbers(!val);
    };

    /**
     * Force codemirror highlight mode
     * @method force_highlight
     * @param {object} - CodeMirror mode
     **/
    Cell.prototype.force_highlight = function(mode) {
        this.user_highlight = mode;
        this.auto_highlight();
    };

    /**
     * Trigger autodetection of highlight scheme for current cell
     * @method auto_highlight
     */
    Cell.prototype.auto_highlight = function () {
        this._auto_highlight(this.class_config.get_sync('highlight_modes'));
    };

    /**
     * Try to autodetect cell highlight mode, or use selected mode
     * @methods _auto_highlight
     * @private
     * @param {String|object|undefined} - CodeMirror mode | 'auto'
     **/
    Cell.prototype._auto_highlight = function (modes) {
        /**
         *Here we handle manually selected modes
         */
        var that = this;
        var mode;
        if( this.user_highlight !== undefined &&  this.user_highlight != 'auto' )
        {
            mode = this.user_highlight;
            CodeMirror.autoLoadMode(this.code_mirror, mode);
            this.code_mirror.setOption('mode', mode);
            return;
        }
        var current_mode = this.code_mirror.getOption('mode', mode);
        var first_line = this.code_mirror.getLine(0);
        // loop on every pairs
        for(mode in modes) {
            var regs = modes[mode].reg;
            // only one key every time but regexp can't be keys...
            for(var i=0; i<regs.length; i++) {
                // here we handle non magic_modes.
                // TODO :
                // On 3.0 and below, these things were regex.
                // But now should be string for json-able config. 
                // We should get rid of assuming they might be already 
                // in a later version of Jupyter.
                var re = regs[i];
                if(typeof(re) === 'string'){
                    re = new RegExp(re) 
                }
                if(first_line.match(re) !== null) {
                    if(current_mode == mode){
                        return;
                    }
                    if (mode.search('magic_') !== 0) {
                        utils.requireCodeMirrorMode(mode, function (spec) {
                            that.code_mirror.setOption('mode', spec);
                        });
                        return;
                    }
                    var open = modes[mode].open || "%%";
                    var close = modes[mode].close || "%%end";
                    var magic_mode = mode;
                    mode = magic_mode.substr(6);
                    if(current_mode == magic_mode){
                        return;
                    }
                    utils.requireCodeMirrorMode(mode, function (spec) {
                        // create on the fly a mode that switch between
                        // plain/text and something else, otherwise `%%` is
                        // source of some highlight issues.
                        CodeMirror.defineMode(magic_mode, function(config) {
                            return CodeMirror.multiplexingMode(
                                CodeMirror.getMode(config, 'text/plain'),
                                // always set something on close
                                {open: open, close: close,
                                 mode: CodeMirror.getMode(config, spec),
                                 delimStyle: "delimit"
                                }
                            );
                        });
                        that.code_mirror.setOption('mode', magic_mode);
                    });
                    return;
                }
            }
        }
        // fallback on default
        var default_mode;
        try {
            default_mode = this._options.cm_config.mode;
        } catch(e) {
            default_mode = 'text/plain';
        }
        if( current_mode === default_mode){
            return;
        }
        this.code_mirror.setOption('mode', default_mode);
    };

    var UnrecognizedCell = function (options) {
        /** Constructor for unrecognized cells */
        Cell.apply(this, arguments);
        this.cell_type = 'unrecognized';
        this.celltoolbar = null;
        this.data = {};
        
        Object.seal(this);
    };

    UnrecognizedCell.prototype = Object.create(Cell.prototype);


    // cannot merge or split unrecognized cells
    UnrecognizedCell.prototype.is_mergeable = function () {
        return false;
    };

    UnrecognizedCell.prototype.is_splittable = function () {
        return false;
    };

    UnrecognizedCell.prototype.toJSON = function () {
        /**
         * deepcopy the metadata so copied cells don't share the same object
         */
        return JSON.parse(JSON.stringify(this.data));
    };

    UnrecognizedCell.prototype.fromJSON = function (data) {
        this.data = data;
        if (data.metadata !== undefined) {
            this.metadata = data.metadata;
        } else {
            data.metadata = this.metadata;
        }
        this.element.find('.inner_cell').find("a").text("Unrecognized cell type: " + data.cell_type);
    };

    UnrecognizedCell.prototype.create_element = function () {
        Cell.prototype.create_element.apply(this, arguments);
        var cell = this.element = $("<div>").addClass('cell unrecognized_cell');
        cell.attr('tabindex','2');

        var prompt = $('<div/>').addClass('prompt input_prompt');
        cell.append(prompt);
        var inner_cell = $('<div/>').addClass('inner_cell');
        inner_cell.append(
            $("<a>")
                .attr("href", "#")
                .text("Unrecognized cell type")
        );
        cell.append(inner_cell);
        this.element = cell;
    };

    UnrecognizedCell.prototype.bind_events = function () {
        Cell.prototype.bind_events.apply(this, arguments);
        var cell = this;
        
        this.element.find('.inner_cell').find("a").click(function () {
            cell.events.trigger('unrecognized_cell.Cell', {cell: cell});
        });
    };

    module.exports = {
        Cell: Cell,
        UnrecognizedCell: UnrecognizedCell
    };

},{"base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/celltoolbar.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var IPython = require('base/js/namespace');
    var events = require('base/js/events');

    var CellToolbar = function (options) {
        /**
         * Constructor
         *
         * Parameters:
         *  options: dictionary
         *      Dictionary of keyword arguments.
         *          events: $(Events) instance 
         *          cell: Cell instance
         *          notebook: Notebook instance 
         *
         *  TODO: This leaks, when cell are deleted
         *  There is still a reference to each celltoolbars.
         */
        CellToolbar._instances.push(this);
        this.notebook = options.notebook;
        this.cell = options.cell;
        this.create_element();
        this.rebuild();
        return this;
    };


    CellToolbar.prototype.create_element = function () {
        this.inner_element = $('<div/>').addClass('celltoolbar');
        this.element = $('<div/>').addClass('ctb_hideshow')
            .append(this.inner_element);
    };


    // The default css style for the outer celltoolbar div
    // (ctb_hideshow) is display: none.
    // To show the cell toolbar, *both* of the following conditions must be met:
    // - A parent container has class `ctb_global_show`
    // - The celltoolbar has the class `ctb_show`
    // This allows global show/hide, as well as per-cell show/hide.

    CellToolbar.global_hide = function () {
        $('body').removeClass('ctb_global_show');
    };


    CellToolbar.global_show = function () {
        $('body').addClass('ctb_global_show');
    };


    CellToolbar.prototype.hide = function () {
        this.element.removeClass('ctb_show');
    };


    CellToolbar.prototype.show = function () {
        this.element.addClass('ctb_show');
    };


    /**
     * Class variable that should contain a dict of all available callback
     * we need to think of wether or not we allow nested namespace
     * @property _callback_dict
     * @private
     * @static
     * @type Dict
     */
    CellToolbar._callback_dict = {};


    /**
     * Class variable that should contain the reverse order list of the button
     * to add to the toolbar of each cell
     * @property _ui_controls_list
     * @private
     * @static
     * @type List
     */
    CellToolbar._ui_controls_list = [];


    /**
     * Class variable that should contain the CellToolbar instances for each
     * cell of the notebook
     *
     * @private
     * @property _instances
     * @static
     * @type List
     */
    CellToolbar._instances = [];


    /**
     * keep a list of all the available presets for the toolbar
     * @private
     * @property _presets
     * @static
     * @type Dict
     */
    CellToolbar._presets = {};


    // this is by design not a prototype.
    /**
     * Register a callback to create an UI element in a cell toolbar.
     * @method register_callback
     * @param name {String} name to use to refer to the callback. It is advised to use a prefix with the name
     * for easier sorting and avoid collision
     * @param callback {function(div, cell)} callback that will be called to generate the ui element
     * @param [cell_types] {List_of_String|undefined} optional list of cell types. If present the UI element
     * will be added only to cells of types in the list.
     *
     *
     * The callback will receive the following element :
     *
     *    * a div in which to add element.
     *    * the cell it is responsible from
     *
     * @example
     *
     * Example that create callback for a button that toggle between `true` and `false` label,
     * with the metadata under the key 'foo' to reflect the status of the button.
     *
     *      // first param reference to a DOM div
     *      // second param reference to the cell.
     *      var toggle =  function(div, cell) {
     *          var button_container = $(div)
     *
     *          // let's create a button that show the  current value of the metadata
     *          var button = $('<div/>').button({label:String(cell.metadata.foo)});
     *
     *          // On click, change the metadata value and update the button label
     *          button.click(function(){
     *                      var v = cell.metadata.foo;
     *                      cell.metadata.foo = !v;
     *                      button.button("option", "label", String(!v));
     *                  })
     *
     *          // add the button to the DOM div.
     *          button_container.append(button);
     *      }
     *
     *      // now we register the callback under the name `foo` to give the
     *      // user the ability to use it later
     *      CellToolbar.register_callback('foo', toggle);
     */
    CellToolbar.register_callback = function(name, callback, cell_types) {
        // Overwrite if it already exists.
        CellToolbar._callback_dict[name] = cell_types ? {callback: callback, cell_types: cell_types} : callback;
    };


    /**
     * Register a preset of UI element in a cell toolbar.
     * Not supported Yet.
     * @method register_preset
     * @param name {String} name to use to refer to the preset. It is advised to use a prefix with the name
     * for easier sorting and avoid collision
     * @param  preset_list {List_of_String} reverse order of the button in the toolbar. Each String of the list
     *          should correspond to a name of a registerd callback.
     *
     * @private
     * @example
     *
     *      CellToolbar.register_callback('foo.c1', function(div, cell){...});
     *      CellToolbar.register_callback('foo.c2', function(div, cell){...});
     *      CellToolbar.register_callback('foo.c3', function(div, cell){...});
     *      CellToolbar.register_callback('foo.c4', function(div, cell){...});
     *      CellToolbar.register_callback('foo.c5', function(div, cell){...});
     *
     *      CellToolbar.register_preset('foo.foo_preset1', ['foo.c1', 'foo.c2', 'foo.c5'])
     *      CellToolbar.register_preset('foo.foo_preset2', ['foo.c4', 'foo.c5'])
     */
    CellToolbar.register_preset = function(name, preset_list, notebook) {
        CellToolbar._presets[name] = preset_list;
        events.trigger('preset_added.CellToolbar', {name: name});
        // When "register_callback" is called by a custom extension, it may be executed after notebook is loaded.
        // In that case, activate the preset if needed.
        if (notebook && notebook.metadata && notebook.metadata.celltoolbar === name){
            CellToolbar.activate_preset(name);
        }
    };

    /**
     * unregister the selected preset, 
     *
     * return true if preset successfully unregistered
     * false otherwise
     *
     **/
    CellToolbar.unregister_preset = function(name){
        if(CellToolbar._presets[name]){
            delete CellToolbar._presets[name];
            events.trigger('unregistered_preset.CellToolbar', {name: name});
            return true
        }
        return false
    }


    /**
     * List the names of the presets that are currently registered.
     *
     * @method list_presets
     * @static
     */
    CellToolbar.list_presets = function() {
        var keys = [];
        for (var k in CellToolbar._presets) {
            keys.push(k);
        }
        return keys;
    };


    /**
     * Activate an UI preset from `register_preset`
     *
     * This does not update the selection UI.
     *
     * @method activate_preset
     * @param preset_name {String} string corresponding to the preset name
     *
     * @static
     * @private
     * @example
     *
     *      CellToolbar.activate_preset('foo.foo_preset1');
     */
    CellToolbar.activate_preset = function(preset_name){
        var preset = CellToolbar._presets[preset_name];

        if(preset !== undefined){
            CellToolbar._ui_controls_list = preset;
            CellToolbar.rebuild_all();
        }

        events.trigger('preset_activated.CellToolbar', {name: preset_name});
    };


    /**
     * This should be called on the class and not on a instance as it will trigger
     * rebuild of all the instances.
     * @method rebuild_all
     * @static
     *
     */
    CellToolbar.rebuild_all = function(){
        for(var i=0; i < CellToolbar._instances.length; i++){
            CellToolbar._instances[i].rebuild();
        }
    };

    /**
     * Rebuild all the button on the toolbar to update its state.
     * @method rebuild
     */
    CellToolbar.prototype.rebuild = function(){
        /**
         * strip evrything from the div
         * which is probably inner_element
         * or this.element.
         */
        this.inner_element.empty();
        this.ui_controls_list = [];

        var callbacks = CellToolbar._callback_dict;
        var preset = CellToolbar._ui_controls_list;
        // Yes we iterate on the class variable, not the instance one.
        for (var i=0; i < preset.length; i++) {
            var key = preset[i];
            var callback = callbacks[key];
            if (!callback) continue;

            if (typeof callback === 'object') {
                if (callback.cell_types.indexOf(this.cell.cell_type) === -1) continue;
                callback = callback.callback;
            }
            
            var local_div = $('<div/>').addClass('button_container');
            try {
                callback(local_div, this.cell, this);
                this.ui_controls_list.push(key);
            } catch (e) {
                console.log("Error in cell toolbar callback " + key, e);
                continue;
            }
            // only append if callback succeeded.
            this.inner_element.append(local_div);
        }

        // If there are no controls or the cell is a rendered TextCell hide the toolbar.
        if (!this.ui_controls_list.length) {
            this.hide();
        } else {
            this.show();
        }
    };


    CellToolbar.utils = {};


    /**
     * A utility function to generate bindings between a checkbox and cell/metadata
     * @method utils.checkbox_ui_generator
     * @static
     *
     * @param name {string} Label in front of the checkbox
     * @param setter {function( cell, newValue )}
     *        A setter method to set the newValue
     * @param getter {function( cell )}
     *        A getter methods which return the current value.
     *
     * @return callback {function( div, cell )} Callback to be passed to `register_callback`
     *
     * @example
     *
     * An exmple that bind the subkey `slideshow.isSectionStart` to a checkbox with a `New Slide` label
     *
     *     var newSlide = CellToolbar.utils.checkbox_ui_generator('New Slide',
     *          // setter
     *          function(cell, value){
     *              // we check that the slideshow namespace exist and create it if needed
     *              if (cell.metadata.slideshow == undefined){cell.metadata.slideshow = {}}
     *              // set the value
     *              cell.metadata.slideshow.isSectionStart = value
     *              },
     *          //geter
     *          function(cell){ var ns = cell.metadata.slideshow;
     *              // if the slideshow namespace does not exist return `undefined`
     *              // (will be interpreted as `false` by checkbox) otherwise
     *              // return the value
     *              return (ns == undefined)? undefined: ns.isSectionStart
     *              }
     *      );
     *
     *      CellToolbar.register_callback('newSlide', newSlide);
     *
     */
    CellToolbar.utils.checkbox_ui_generator = function(name, setter, getter){
        return function(div, cell, celltoolbar) {
            var button_container = $(div);

            var chkb = $('<input/>').attr('type', 'checkbox');
            var lbl = $('<label/>').append($('<span/>').text(name));
            lbl.append(chkb);
            chkb.attr("checked", getter(cell));

            chkb.click(function(){
                        var v = getter(cell);
                        setter(cell, !v);
                        chkb.attr("checked", !v);
            });
            button_container.append($('<span/>').append(lbl));
        };
    };


    /**
     * A utility function to generate bindings between a input field and cell/metadata
     * @method utils.input_ui_generator
     * @static
     *
     * @param name {string} Label in front of the input field
     * @param setter {function( cell, newValue )}
     *        A setter method to set the newValue
     * @param getter {function( cell )}
     *        A getter methods which return the current value.
     *
     * @return callback {function( div, cell )} Callback to be passed to `register_callback`
     *
     */
    CellToolbar.utils.input_ui_generator = function(name, setter, getter){
        return function(div, cell, celltoolbar) {
            var button_container = $(div);

            var text = $('<input/>').attr('type', 'text');
            var lbl = $('<label/>').append($('<span/>').text(name));
            lbl.append(text);
            text.attr("value", getter(cell));

            text.keyup(function(){
                setter(cell, text.val());
            });
            button_container.append($('<span/>').append(lbl));
            IPython.keyboard_manager.register_events(text);
        };
    };

    /**
     * A utility function to generate bindings between a dropdown list cell
     * @method utils.select_ui_generator
     * @static
     *
     * @param list_list {list_of_sublist} List of sublist of metadata value and name in the dropdown list.
     *        subslit shoud contain 2 element each, first a string that woul be displayed in the dropdown list,
     *        and second the corresponding value to  be passed to setter/return by getter. the corresponding value 
     *        should not be "undefined" or behavior can be unexpected.
     * @param setter {function( cell, newValue )}
     *        A setter method to set the newValue
     * @param getter {function( cell )}
     *        A getter methods which return the current value of the metadata.
     * @param [label=""] {String} optionnal label for the dropdown menu
     *
     * @return callback {function( div, cell )} Callback to be passed to `register_callback`
     *
     * @example
     *
     *      var select_type = CellToolbar.utils.select_ui_generator([
     *              ["<None>"       , "None"      ],
     *              ["Header Slide" , "header_slide" ],
     *              ["Slide"        , "slide"        ],
     *              ["Fragment"     , "fragment"     ],
     *              ["Skip"         , "skip"         ],
     *              ],
     *              // setter
     *              function(cell, value){
     *                  // we check that the slideshow namespace exist and create it if needed
     *                  if (cell.metadata.slideshow == undefined){cell.metadata.slideshow = {}}
     *                  // set the value
     *                  cell.metadata.slideshow.slide_type = value
     *                  },
     *              //geter
     *              function(cell){ var ns = cell.metadata.slideshow;
     *                  // if the slideshow namespace does not exist return `undefined`
     *                  // (will be interpreted as `false` by checkbox) otherwise
     *                  // return the value
     *                  return (ns == undefined)? undefined: ns.slide_type
     *                  }
     *      CellToolbar.register_callback('slideshow.select', select_type);
     *
     */
    CellToolbar.utils.select_ui_generator = function(list_list, setter, getter, label) {
        label = label || "";
        return function(div, cell, celltoolbar) {
            var button_container = $(div);
            var lbl = $("<label/>").append($('<span/>').text(label));
            var select = $('<select/>');
            for(var i=0; i < list_list.length; i++){
                var opt = $('<option/>')
                    .attr('value', list_list[i][1])
                    .text(list_list[i][0]);
                select.append(opt);
            }
            select.val(getter(cell));
            select.change(function(){
                        setter(cell, select.val());
                    });
            button_container.append($('<span/>').append(lbl).append(select));
        };
    };

    // Backwards compatability.
    IPython.CellToolbar = CellToolbar;

    exports.CellToolbar = CellToolbar;

},{"base/js/events":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/events.js","base/js/namespace":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/namespace.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/celltoolbarpresets/default.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var celltoolbar = require('notebook/js/celltoolbar');
    var dialog = require('base/js/dialog');

    var CellToolbar = celltoolbar.CellToolbar;

    var raw_edit = function (cell) {
        dialog.edit_metadata({
            md: cell.metadata,
            callback: function (md) {
                cell.metadata = md;
            },
            name: 'Cell',
            notebook: this.notebook,
            keyboard_manager: this.keyboard_manager
        });
    };

    var add_raw_edit_button = function(div, cell) {
        var button_container = $(div);
        var button = $('<button/>')
            .addClass("btn btn-default btn-xs")
            .text("Edit Metadata")
            .click( function () {
                raw_edit(cell);
                return false;
            });
        button_container.append(button);
    };

    var register = function (notebook) {
        CellToolbar.register_callback('default.rawedit', add_raw_edit_button);
        raw_edit = $.proxy(raw_edit, {
            notebook: notebook,
            keyboard_manager: notebook.keyboard_manager
        });

        var example_preset = [];
        example_preset.push('default.rawedit');

        CellToolbar.register_preset('Edit Metadata', example_preset, notebook);
        console.log('Default extension for cell metadata editing loaded.');
    };
    exports.register = register;

},{"base/js/dialog":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/dialog.js","notebook/js/celltoolbar":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/celltoolbar.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/celltoolbarpresets/rawcell.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var celltoolbar = require('notebook/js/celltoolbar');
    var dialog = require('base/js/dialog');
    var keyboard = require('base/js/keyboard');

    var CellToolbar = celltoolbar.CellToolbar;
    var raw_cell_preset = [];

    var select_type = CellToolbar.utils.select_ui_generator([
    ["None", "-"],
    ["LaTeX", "text/latex"],
    ["reST", "text/restructuredtext"],
    ["HTML", "text/html"],
    ["Markdown", "text/markdown"],
    ["Python", "text/x-python"],
    ["Custom", "dialog"],

    ],
      // setter
      function(cell, value) {
        if (value === "-") {
          delete cell.metadata.raw_mimetype;
        } else if (value === 'dialog'){
            var dialog = $('<div/>').append(
                $("<p/>")
                    .text("Set the MIME type of the raw cell:")
            ).append(
                $("<br/>")
            ).append(
                $('<input/>').attr('type','text').attr('size','25')
                .val(cell.metadata.raw_mimetype || "-")
            );
            dialog.modal({
                title: "Raw Cell MIME Type",
                body: dialog,
                buttons : {
                    "Cancel": {},
                    "OK": {
                        class: "btn-primary",
                        click: function () {
                            console.log(cell);
                            cell.metadata.raw_mimetype = $(this).find('input').val();
                            console.log(cell.metadata);
                        }
                    }
                },
                open : function (event, ui) {
                    var that = $(this);
                    // Upon ENTER, click the OK button.
                    that.find('input[type="text"]').keydown(function (event, ui) {
                        if (event.which === keyboard.keycodes.enter) {
                            that.find('.btn-primary').first().click();
                            return false;
                        }
                    });
                    that.find('input[type="text"]').focus().select();
                }
            });
        } else {
          cell.metadata.raw_mimetype = value;
        }
      },
      //getter
      function(cell) {
        return cell.metadata.raw_mimetype || "";
      },
      // name
      "Raw NBConvert Format"
    );

    var register = function (notebook) {
    CellToolbar.register_callback('raw_cell.select', select_type, ['raw']);
    raw_cell_preset.push('raw_cell.select');

    CellToolbar.register_preset('Raw Cell Format', raw_cell_preset, notebook);
    console.log('Raw Cell Format toolbar preset loaded.');
    };
    exports.register = register;

},{"base/js/dialog":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/dialog.js","base/js/keyboard":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/keyboard.js","notebook/js/celltoolbar":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/celltoolbar.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/celltoolbarpresets/slideshow.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var celltoolbar = require('notebook/js/celltoolbar');

    var CellToolbar = celltoolbar.CellToolbar;
    var slideshow_preset = [];

    var select_type = CellToolbar.utils.select_ui_generator([
            ["-"            ,"-"            ],
            ["Slide"        ,"slide"        ],
            ["Sub-Slide"    ,"subslide"     ],
            ["Fragment"     ,"fragment"     ],
            ["Skip"         ,"skip"         ],
            ["Notes"        ,"notes"        ],
            ],
            // setter
            function(cell, value){
                // we check that the slideshow namespace exist and create it if needed
                if (cell.metadata.slideshow === undefined){cell.metadata.slideshow = {};}
                // set the value
                cell.metadata.slideshow.slide_type = value;
                },
            //geter
            function(cell){ var ns = cell.metadata.slideshow;
                // if the slideshow namespace does not exist return `undefined`
                // (will be interpreted as `false` by checkbox) otherwise
                // return the value
                return (ns === undefined)? undefined: ns.slide_type;
                },
            "Slide Type");

    var register = function (notebook) {
        CellToolbar.register_callback('slideshow.select',select_type);
        slideshow_preset.push('slideshow.select');

        CellToolbar.register_preset('Slideshow',slideshow_preset, notebook);
        console.log('Slideshow extension for metadata editing loaded.');
    };
    exports.register = register;

},{"notebook/js/celltoolbar":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/celltoolbar.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/codecell.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 *
 *
 * @module codecell
 * @namespace codecell
 * @class CodeCell
 */
    "use strict";

    var IPython = require('base/js/namespace');
    var utils = require('base/js/utils');
    var keyboard = require('base/js/keyboard');
    var configmod = require('services/config');
    var cell = require('notebook/js/cell');
    var outputarea = require('notebook/js/outputarea');
    var completer = require('notebook/js/completer');
    var celltoolbar = require('notebook/js/celltoolbar');

    var Cell = cell.Cell;

    /* local util for codemirror */
    var posEq = function(a, b) {return a.line === b.line && a.ch === b.ch;};

    /**
     *
     * function to delete until previous non blanking space character
     * or first multiple of 4 tabstop.
     * @private
     */
    CodeMirror.commands.delSpaceToPrevTabStop = function(cm){
        var from = cm.getCursor(true), to = cm.getCursor(false), sel = !posEq(from, to);
        if (!posEq(from, to)) { cm.replaceRange("", from, to); return; }
        var cur = cm.getCursor(), line = cm.getLine(cur.line);
        var tabsize = cm.getOption('tabSize');
        var chToPrevTabStop = cur.ch-(Math.ceil(cur.ch/tabsize)-1)*tabsize;
        from = {ch:cur.ch-chToPrevTabStop,line:cur.line};
        var select = cm.getRange(from,cur);
        if( select.match(/^\ +$/) !== null){
            cm.replaceRange("",from,cur);
        } else {
            cm.deleteH(-1,"char");
        }
    };

    var keycodes = keyboard.keycodes;

    var CodeCell = function (kernel, options) {
        /**
         * Constructor
         *
         * A Cell conceived to write code.
         *
         * Parameters:
         *  kernel: Kernel instance
         *      The kernel doesn't have to be set at creation time, in that case
         *      it will be null and set_kernel has to be called later.
         *  options: dictionary
         *      Dictionary of keyword arguments.
         *          events: $(Events) instance 
         *          config: dictionary
         *          keyboard_manager: KeyboardManager instance 
         *          notebook: Notebook instance
         *          tooltip: Tooltip instance
         */
        this.kernel = kernel || null;
        this.notebook = options.notebook;
        this.collapsed = false;
        this.events = options.events;
        this.tooltip = options.tooltip;
        this.config = options.config;
        this.class_config = new configmod.ConfigWithDefaults(this.config,
                                        CodeCell.config_defaults, 'CodeCell');

        // create all attributed in constructor function
        // even if null for V8 VM optimisation
        this.input_prompt_number = null;
        this.celltoolbar = null;
        this.output_area = null;

        this.last_msg_id = null;
        this.completer = null;

        Cell.apply(this,[{
            config: $.extend({}, CodeCell.options_default), 
            keyboard_manager: options.keyboard_manager, 
            events: this.events}]);

        // Attributes we want to override in this subclass.
        this.cell_type = "code";
        var that  = this;
        this.element.focusout(
            function() { that.auto_highlight(); }
        );
    };

    CodeCell.options_default = {
        cm_config : {
            extraKeys: {
                "Tab" :  "indentMore",
                "Shift-Tab" : "indentLess",
                "Backspace" : "delSpaceToPrevTabStop",
                "Cmd-/" : "toggleComment",
                "Ctrl-/" : "toggleComment"
            },
            mode: 'text',
            theme: 'ipython',
            matchBrackets: true,
            autoCloseBrackets: true
        },
        highlight_modes : {
            'magic_javascript'    :{'reg':['^%%javascript']},
            'magic_perl'          :{'reg':['^%%perl']},
            'magic_ruby'          :{'reg':['^%%ruby']},
            'magic_python'        :{'reg':['^%%python3?']},
            'magic_shell'         :{'reg':['^%%bash']},
            'magic_r'             :{'reg':['^%%R']},
            'magic_text/x-cython' :{'reg':['^%%cython']},
        },
    };

    CodeCell.config_defaults = CodeCell.options_default;

    CodeCell.msg_cells = {};

    CodeCell.prototype = Object.create(Cell.prototype);

    /** @method create_element */
    CodeCell.prototype.create_element = function () {
        Cell.prototype.create_element.apply(this, arguments);
        var that = this;

        var cell =  $('<div></div>').addClass('cell code_cell');
        cell.attr('tabindex','2');

        var input = $('<div></div>').addClass('input');
        this.input = input;
        var prompt = $('<div/>').addClass('prompt input_prompt');
        var inner_cell = $('<div/>').addClass('inner_cell');
        this.celltoolbar = new celltoolbar.CellToolbar({
            cell: this, 
            notebook: this.notebook});
        inner_cell.append(this.celltoolbar.element);
        var input_area = $('<div/>').addClass('input_area');
        this.code_mirror = new CodeMirror(input_area.get(0), this._options.cm_config);
        // In case of bugs that put the keyboard manager into an inconsistent state,
        // ensure KM is enabled when CodeMirror is focused:
        this.code_mirror.on('focus', function () {
            if (that.keyboard_manager) {
                that.keyboard_manager.enable();
            }
        });
        this.code_mirror.on('keydown', $.proxy(this.handle_keyevent,this));
        $(this.code_mirror.getInputField()).attr("spellcheck", "false");
        inner_cell.append(input_area);
        input.append(prompt).append(inner_cell);

        var output = $('<div></div>');
        cell.append(input).append(output);
        this.element = cell;
        this.output_area = new outputarea.OutputArea({
            selector: output, 
            prompt_area: true, 
            events: this.events, 
            keyboard_manager: this.keyboard_manager});
        this.completer = new completer.Completer(this, this.events);
    };

    /** @method bind_events */
    CodeCell.prototype.bind_events = function () {
        Cell.prototype.bind_events.apply(this);
        var that = this;

        this.element.focusout(
            function() { that.auto_highlight(); }
        );
    };


    /**
     *  This method gets called in CodeMirror's onKeyDown/onKeyPress
     *  handlers and is used to provide custom key handling. Its return
     *  value is used to determine if CodeMirror should ignore the event:
     *  true = ignore, false = don't ignore.
     *  @method handle_codemirror_keyevent
     */

    CodeCell.prototype.handle_codemirror_keyevent = function (editor, event) {

        var that = this;
        // whatever key is pressed, first, cancel the tooltip request before
        // they are sent, and remove tooltip if any, except for tab again
        var tooltip_closed = null;
        if (event.type === 'keydown' && event.which !== keycodes.tab ) {
            tooltip_closed = this.tooltip.remove_and_cancel_tooltip();
        }

        var cur = editor.getCursor();
        if (event.keyCode === keycodes.enter){
            this.auto_highlight();
        }

        if (event.which === keycodes.down && event.type === 'keypress' && this.tooltip.time_before_tooltip >= 0) {
            // triger on keypress (!) otherwise inconsistent event.which depending on plateform
            // browser and keyboard layout !
            // Pressing '(' , request tooltip, don't forget to reappend it
            // The second argument says to hide the tooltip if the docstring
            // is actually empty
            this.tooltip.pending(that, true);
        } else if ( tooltip_closed && event.which === keycodes.esc && event.type === 'keydown') {
            // If tooltip is active, cancel it.  The call to
            // remove_and_cancel_tooltip above doesn't pass, force=true.
            // Because of this it won't actually close the tooltip
            // if it is in sticky mode. Thus, we have to check again if it is open
            // and close it with force=true.
            if (!this.tooltip._hidden) {
                this.tooltip.remove_and_cancel_tooltip(true);
            }
            // If we closed the tooltip, don't let CM or the global handlers
            // handle this event.
            event.codemirrorIgnore = true;
            event._ipkmIgnore = true;
            event.preventDefault();
            return true;
        } else if (event.keyCode === keycodes.tab && event.type === 'keydown' && event.shiftKey) {
                if (editor.somethingSelected() || editor.getSelections().length !== 1){
                    var anchor = editor.getCursor("anchor");
                    var head = editor.getCursor("head");
                    if( anchor.line !== head.line){
                        return false;
                    }
                }
                var pre_cursor = editor.getRange({line:cur.line,ch:0},cur);
                if (pre_cursor.trim() === "") {
                    // Don't show tooltip if the part of the line before the cursor
                    // is empty.  In this case, let CodeMirror handle indentation.
                    return false;
                } 
                this.tooltip.request(that);
                event.codemirrorIgnore = true;
                event.preventDefault();
                return true;
        } else if (event.keyCode === keycodes.tab && event.type === 'keydown') {
            // Tab completion.
            this.tooltip.remove_and_cancel_tooltip();

            // completion does not work on multicursor, it might be possible though in some cases
            if (editor.somethingSelected() || editor.getSelections().length > 1) {
                return false;
            }
            var pre_cursor = editor.getRange({line:cur.line,ch:0},cur);
            if (pre_cursor.trim() === "") {
                // Don't autocomplete if the part of the line before the cursor
                // is empty.  In this case, let CodeMirror handle indentation.
                return false;
            } else {
                event.codemirrorIgnore = true;
                event.preventDefault();
                this.completer.startCompletion();
                return true;
            }
        } 
        
        // keyboard event wasn't one of those unique to code cells, let's see
        // if it's one of the generic ones (i.e. check edit mode shortcuts)
        return Cell.prototype.handle_codemirror_keyevent.apply(this, [editor, event]);
    };

    // Kernel related calls.

    CodeCell.prototype.set_kernel = function (kernel) {
        this.kernel = kernel;
    };

    /**
     * Execute current code cell to the kernel
     * @method execute
     */
    CodeCell.prototype.execute = function (stop_on_error) {
        if (!this.kernel || !this.kernel.is_connected()) {
            console.log("Can't execute, kernel is not connected.");
            return;
        }

        this.output_area.clear_output(false, true);

        if (stop_on_error === undefined) {
            stop_on_error = true;
        }

        var old_msg_id = this.last_msg_id;

        if (old_msg_id) {
            this.kernel.clear_callbacks_for_msg(old_msg_id);
            if (old_msg_id) {
                delete CodeCell.msg_cells[old_msg_id];
            }
        }
        if (this.get_text().trim().length === 0) {
            // nothing to do
            this.set_input_prompt(null);
            return;
        }
        this.set_input_prompt('*');
        this.element.addClass("running");
        var callbacks = this.get_callbacks();
        
        this.last_msg_id = this.kernel.execute(this.get_text(), callbacks, {silent: false, store_history: true,
            stop_on_error : stop_on_error});
        CodeCell.msg_cells[this.last_msg_id] = this;
        this.render();
        this.events.trigger('execute.CodeCell', {cell: this});
    };

    /**
     * Construct the default callbacks for
     * @method get_callbacks
     */
    CodeCell.prototype.get_callbacks = function () {
        var that = this;
        return {
            shell : {
                reply : $.proxy(this._handle_execute_reply, this),
                payload : {
                    set_next_input : $.proxy(this._handle_set_next_input, this),
                    page : $.proxy(this._open_with_pager, this)
                }
            },
            iopub : {
                output : function() { 
                    that.output_area.handle_output.apply(that.output_area, arguments);
                }, 
                clear_output : function() { 
                    that.output_area.handle_clear_output.apply(that.output_area, arguments);
                }, 
            },
            input : $.proxy(this._handle_input_request, this)
        };
    };

    CodeCell.prototype._open_with_pager = function (payload) {
        this.events.trigger('open_with_text.Pager', payload);
    };

    /**
     * @method _handle_execute_reply
     * @private
     */
    CodeCell.prototype._handle_execute_reply = function (msg) {
        this.set_input_prompt(msg.content.execution_count);
        this.element.removeClass("running");
        this.events.trigger('set_dirty.Notebook', {value: true});
    };

    /**
     * @method _handle_set_next_input
     * @private
     */
    CodeCell.prototype._handle_set_next_input = function (payload) {
        var data = {'cell': this, 'text': payload.text, replace: payload.replace};
        this.events.trigger('set_next_input.Notebook', data);
    };

    /**
     * @method _handle_input_request
     * @private
     */
    CodeCell.prototype._handle_input_request = function (msg) {
        this.output_area.append_raw_input(msg);
    };


    // Basic cell manipulation.

    CodeCell.prototype.select = function () {
        var cont = Cell.prototype.select.apply(this);
        if (cont) {
            this.code_mirror.refresh();
            this.auto_highlight();
        }
        return cont;
    };

    CodeCell.prototype.render = function () {
        var cont = Cell.prototype.render.apply(this);
        // Always execute, even if we are already in the rendered state
        return cont;
    };

    CodeCell.prototype.select_all = function () {
        var start = {line: 0, ch: 0};
        var nlines = this.code_mirror.lineCount();
        var last_line = this.code_mirror.getLine(nlines-1);
        var end = {line: nlines-1, ch: last_line.length};
        this.code_mirror.setSelection(start, end);
    };


    CodeCell.prototype.collapse_output = function () {
        this.output_area.collapse();
    };


    CodeCell.prototype.expand_output = function () {
        this.output_area.expand();
        this.output_area.unscroll_area();
    };

    CodeCell.prototype.scroll_output = function () {
        this.output_area.expand();
        this.output_area.scroll_if_long();
    };

    CodeCell.prototype.toggle_output = function () {
        this.output_area.toggle_output();
    };

    CodeCell.prototype.toggle_output_scroll = function () {
        this.output_area.toggle_scroll();
    };


    CodeCell.input_prompt_classical = function (prompt_value, lines_number) {
        var ns;
        if (prompt_value === undefined || prompt_value === null) {
            ns = "&nbsp;";
        } else {
            ns = encodeURIComponent(prompt_value);
        }
        return 'In&nbsp;[' + ns + ']:';
    };

    CodeCell.input_prompt_continuation = function (prompt_value, lines_number) {
        var html = [CodeCell.input_prompt_classical(prompt_value, lines_number)];
        for(var i=1; i < lines_number; i++) {
            html.push(['...:']);
        }
        return html.join('<br/>');
    };

    CodeCell.input_prompt_function = CodeCell.input_prompt_classical;


    CodeCell.prototype.set_input_prompt = function (number) {
        var nline = 1;
        if (this.code_mirror !== undefined) {
           nline = this.code_mirror.lineCount();
        }
        this.input_prompt_number = number;
        var prompt_html = CodeCell.input_prompt_function(this.input_prompt_number, nline);
        // This HTML call is okay because the user contents are escaped.
        this.element.find('div.input_prompt').html(prompt_html);
    };


    CodeCell.prototype.clear_input = function () {
        this.code_mirror.setValue('');
    };


    CodeCell.prototype.get_text = function () {
        return this.code_mirror.getValue();
    };


    CodeCell.prototype.set_text = function (code) {
        return this.code_mirror.setValue(code);
    };


    CodeCell.prototype.clear_output = function (wait) {
        this.output_area.clear_output(wait);
        this.set_input_prompt();
    };


    // JSON serialization

    CodeCell.prototype.fromJSON = function (data) {
        Cell.prototype.fromJSON.apply(this, arguments);
        if (data.cell_type === 'code') {
            if (data.source !== undefined) {
                this.set_text(data.source);
                // make this value the starting point, so that we can only undo
                // to this state, instead of a blank cell
                this.code_mirror.clearHistory();
                this.auto_highlight();
            }
            this.set_input_prompt(data.execution_count);
            this.output_area.trusted = data.metadata.trusted || false;
            this.output_area.fromJSON(data.outputs, data.metadata);
        }
    };


    CodeCell.prototype.toJSON = function () {
        var data = Cell.prototype.toJSON.apply(this);
        data.source = this.get_text();
        // is finite protect against undefined and '*' value
        if (isFinite(this.input_prompt_number)) {
            data.execution_count = this.input_prompt_number;
        } else {
            data.execution_count = null;
        }
        var outputs = this.output_area.toJSON();
        data.outputs = outputs;
        data.metadata.trusted = this.output_area.trusted;
        data.metadata.collapsed = this.output_area.collapsed;
        if (this.output_area.scroll_state === 'auto') {
            delete data.metadata.scrolled;
        } else {
            data.metadata.scrolled = this.output_area.scroll_state;
        }
        return data;
    };

    /**
     * handle cell level logic when the cursor moves away from a cell
     * @method unselect
     * @return is the action being taken
     */
    CodeCell.prototype.unselect = function (leave_selected) {
        var cont = Cell.prototype.unselect.apply(this, [leave_selected]);
        if (cont) {
            // When a code cell is unselected, make sure that the corresponding
            // tooltip and completer to that cell is closed.
            this.tooltip.remove_and_cancel_tooltip(true);
            if (this.completer !== null) {
                this.completer.close();
            }
        }
        return cont;
    };

    // Backwards compatability.
    IPython.CodeCell = CodeCell;

    exports.CodeCell = CodeCell;

},{"base/js/keyboard":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/keyboard.js","base/js/namespace":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/namespace.js","base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js","notebook/js/cell":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/cell.js","notebook/js/celltoolbar":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/celltoolbar.js","notebook/js/completer":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/completer.js","notebook/js/outputarea":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/outputarea.js","services/config":"/Users/jon/jupyter/notebook/notebook/static-src/services/config.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/commandpalette.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

    "use strict";

    var QH = require("notebook/js/quickhelp");
    
    /**
     * Humanize the action name to be consumed by user.
     * internaly the actions anem are of the form
     * <namespace>.<description-with-dashes>
     * we drop <namesapce> and replace dashes for space.
     */
    var humanize_action_id = function(str) {
      return str.split('.')[1].replace(/-/g, ' ').replace(/_/g, '-');
    };

    /**
     * given an action id return 'command-shortcut', 'edit-shortcut' or 'no-shortcut'
     * for the action. This allows us to tag UI in order to visually distinguish
     * wether an action have a keybinding or not.
     **/
    var get_mode_for_action_id = function(name, notebook) {
      var shortcut = notebook.keyboard_manager.command_shortcuts.get_action_shortcut(name);
      if (shortcut) {
        return 'command-shortcut';
      }
      shortcut = notebook.keyboard_manager.edit_shortcuts.get_action_shortcut(name);
      if (shortcut) {
        return 'edit-shortcut';
      }
      return 'no-shortcut';
    };

    var CommandPalette = function(notebook) {
        if(!notebook){
          throw new Error("CommandPalette takes a notebook non-null mandatory arguement");
        }

        // typeahead lib need a specific layout with specific class names.
        // the following just does that
        var form = $('<form/>');
        var container = $('<div/>').addClass('typeahead-container');
        var field = $('<div/>').addClass('typeahead-field');
        var input = $('<input/>').attr('type', 'search');

        field
          .append(
            $('<span>').addClass('typeahead-query').append(
              input
            )
          )
          .append(
            $('<span/>').addClass('typeahead-button').append(
              $('<button/>').attr('type', 'submit').append(
                $('<span/>').addClass('typeahead-search-icon')
              )
            )
          );

        container.append(field);
        form.append(container);


        var mod = $('<div/>').addClass('modal cmd-palette').append(
          $('<div/>').addClass('modal-dialog')
          .append(
            $('<div/>').addClass('modal-content').append(
              $('<div/>').addClass('modal-body')
              .append(
                form
              )
            )
          )
        )
        // end setting up right layout
        .modal({show: false, backdrop:true})
        .on('shown.bs.modal', function () {
              // click on button trigger de-focus on mouse up.
              // or somethign like that.
              setTimeout(function(){input.focus();}, 100);
        });

        notebook.keyboard_manager.disable();

        var before_close = function() {
          // little trick to trigger early in onsubmit
          // when the action called pop-up a dialog
          // insure this function is only called once
          if (before_close.ok) {
            return;
          }
          var cell = notebook.get_selected_cell();
          if (cell) {
            cell.select();
          }
          if (notebook.keyboard_manager) {
            notebook.keyboard_manager.enable();
            notebook.keyboard_manager.command_mode();
          }
          before_close.ok = true; // avoid double call.
        };
        
        mod.on("hide.bs.modal", before_close);
        

        // will be trigger when user select action
        var onSubmit = function(node, query, result, resultCount) {
          if (actions.indexOf(result.key) >= 0) {
            before_close();
            notebook.keyboard_manager.actions.call(result.key);
          } else {
            console.warning("No command " + result.key);
          }
          mod.modal('hide');
        };

        // generate structure needed for typeahead layout and ability to search
        var src = {};

        var actions = Object.keys(notebook.keyboard_manager.actions._actions);

        for (var i = 0; i < actions.length; i++) {
          var action_id = actions[i];
          var action = notebook.keyboard_manager.actions.get(action_id);
          var group = action_id.split('.')[0];
          if (group === 'ipython') {
            group = 'built-in';
          }

          src[group] = src[group] || {
            data: [],
            display: 'display'
          };

          var short = notebook.keyboard_manager.command_shortcuts.get_action_shortcut(action_id) ||
            notebook.keyboard_manager.edit_shortcuts.get_action_shortcut(action_id);
          if (short) {
            short = QH.humanize_sequence(short);
          }

          src[group].data.push({
            display: humanize_action_id(action_id),
            shortcut: short,
            mode_shortcut: get_mode_for_action_id(action_id, notebook),
            group: group,
            icon: action.icon,
            help: action.help,
            key: action_id,
          });
        }

        // now src is the right structure for typeahead

        input.typeahead({
          emptyTemplate: "No results found for <pre>{{query}}</pre>",
          maxItem: 1e3,
          minLength: 0,
          hint: true,
          group: ["group", "{{group}} extension"],
          searchOnFocus: true,
          mustSelectItem: true,
          template: '<i class="fa fa-icon {{icon}}"></i>{{display}}  <div class="pull-right {{mode_shortcut}}">{{shortcut}}</div>',
          order: "asc",
          source: src,
          callback: {
            onSubmit: onSubmit,
            onClickAfter: onSubmit
          },
          debug: false,
        });

        mod.modal('show');
    };
    module.exports = {'CommandPalette': CommandPalette}; 

},{"notebook/js/quickhelp":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/quickhelp.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/completer.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var utils = require('base/js/utils');
    var keyboard = require('base/js/keyboard');
    require('notebook/js/contexthint');

    // easier key mapping
    var keycodes = keyboard.keycodes;

    var prepend_n_prc = function(str, n) {
        for( var i =0 ; i< n ; i++){
            str = '%'+str ;
        }
        return str;
    };

    var _existing_completion = function(item, completion_array){
        for( var i=0; i < completion_array.length; i++) {
            if (completion_array[i].trim().substr(-item.length) == item) {
                return true;
            }
        }
        return false;
    };

    // what is the common start of all completions
    function shared_start(B, drop_prct) {
        if (B.length == 1) {
            return B[0];
        }
        var A = [];
        var common;
        var min_lead_prct = 10;
        for (var i = 0; i < B.length; i++) {
            var str = B[i].str;
            var localmin = 0;
            if(drop_prct === true){
                while ( str.substr(0, 1) == '%') {
                    localmin = localmin+1;
                    str = str.substring(1);
                }
            }
            min_lead_prct = Math.min(min_lead_prct, localmin);
            A.push(str);
        }

        if (A.length > 1) {
            var tem1, tem2, s;
            A = A.slice(0).sort();
            tem1 = A[0];
            s = tem1.length;
            tem2 = A.pop();
            while (s && tem2.indexOf(tem1) == -1) {
                tem1 = tem1.substring(0, --s);
            }
            if (tem1 === "" || tem2.indexOf(tem1) !== 0) {
                return {
                    str:prepend_n_prc('', min_lead_prct),
                    type: "computed",
                    from: B[0].from,
                    to: B[0].to
                    };
            }
            return {
                str: prepend_n_prc(tem1, min_lead_prct),
                type: "computed",
                from: B[0].from,
                to: B[0].to
            };
        }
        return null;
    }


    var Completer = function (cell, events) {
        this.cell = cell;
        this.editor = cell.code_mirror;
        var that = this;
        events.on('kernel_busy.Kernel', function () {
            that.skip_kernel_completion = true;
        });
        events.on('kernel_idle.Kernel', function () {
            that.skip_kernel_completion = false;
        });
    };

    Completer.prototype.startCompletion = function () {
        /**
         * call for a 'first' completion, that will set the editor and do some
         * special behavior like autopicking if only one completion available.
         */
        if (this.editor.somethingSelected()|| this.editor.getSelections().length > 1) return;
        this.done = false;
        // use to get focus back on opera
        this.carry_on_completion(true);
    };


    // easy access for julia to monkeypatch
    //
    Completer.reinvoke_re = /[%0-9a-z._/\\:~-]/i;

    Completer.prototype.reinvoke= function(pre_cursor, block, cursor){
        return Completer.reinvoke_re.test(pre_cursor);
    };

    /**
     *
     * pass true as parameter if this is the first invocation of the completer
     * this will prevent the completer to dissmiss itself if it is not on a
     * word boundary like pressing tab after a space, and make it autopick the
     * only choice if there is only one which prevent from popping the UI.  as
     * well as fast-forwarding the typing if all completion have a common
     * shared start
     **/
    Completer.prototype.carry_on_completion = function (first_invocation) {
        /**
         * Pass true as parameter if you want the completer to autopick when
         * only one completion. This function is automatically reinvoked at
         * each keystroke with first_invocation = false
         */
        var cur = this.editor.getCursor();
        var line = this.editor.getLine(cur.line);
        var pre_cursor = this.editor.getRange({
            line: cur.line,
            ch: cur.ch - 1
        }, cur);

        // we need to check that we are still on a word boundary
        // because while typing the completer is still reinvoking itself
        // so dismiss if we are on a "bad" caracter
        if (!this.reinvoke(pre_cursor) && !first_invocation) {
            this.close();
            return;
        }

        this.autopick = false;
        if (first_invocation) {
            this.autopick = true;
        }

        // We want a single cursor position.
        if (this.editor.somethingSelected()|| this.editor.getSelections().length > 1) {
            return;
        }

        // one kernel completion came back, finish_completing will be called with the results
        // we fork here and directly call finish completing if kernel is busy
        var cursor_pos = utils.to_absolute_cursor_pos(this.editor, cur);
        if (this.skip_kernel_completion) {
            this.finish_completing({ content: {
                matches: [],
                cursor_start: cursor_pos,
                cursor_end: cursor_pos,
            }});
        } else {
            this.cell.kernel.complete(this.editor.getValue(), cursor_pos,
                $.proxy(this.finish_completing, this)
            );
        }
    };

    Completer.prototype.finish_completing = function (msg) {
        /**
         * let's build a function that wrap all that stuff into what is needed
         * for the new completer:
         */
        var content = msg.content;
        var start = content.cursor_start;
        var end = content.cursor_end;
        var matches = content.matches;

        var cur = this.editor.getCursor();
        if (end === null) {
            // adapted message spec replies don't have cursor position info,
            // interpret end=null as current position,
            // and negative start relative to that
            end = utils.to_absolute_cursor_pos(this.editor, cur);
            if (start === null) {
                start = end;
            } else if (start < 0) {
                start = end + start;
            }
        }
        var results = CodeMirror.contextHint(this.editor);
        var filtered_results = [];
        //remove results from context completion
        //that are already in kernel completion
        var i;
        for (i=0; i < results.length; i++) {
            if (!_existing_completion(results[i].str, matches)) {
                filtered_results.push(results[i]);
            }
        }

        // append the introspection result, in order, at at the beginning of
        // the table and compute the replacement range from current cursor
        // positon and matched_text length.
        var from = utils.from_absolute_cursor_pos(this.editor, start);
        var to = utils.from_absolute_cursor_pos(this.editor, end);
        for (i = matches.length - 1; i >= 0; --i) {
            filtered_results.unshift({
                str: matches[i],
                type: "introspection",
                from: from,
                to: to
            });
        }

        // one the 2 sources results have been merge, deal with it
        this.raw_result = filtered_results;

        // if empty result return
        if (!this.raw_result || !this.raw_result.length) return;

        // When there is only one completion, use it directly.
        if (this.autopick && this.raw_result.length == 1) {
            this.insert(this.raw_result[0]);
            return;
        }

        if (this.raw_result.length == 1) {
            // test if first and only completion totally matches
            // what is typed, in this case dismiss
            var str = this.raw_result[0].str;
            var pre_cursor = this.editor.getRange({
                line: cur.line,
                ch: cur.ch - str.length
            }, cur);
            if (pre_cursor == str) {
                this.close();
                return;
            }
        }

        if (!this.visible) {
            this.complete = $('<div/>').addClass('completions');
            this.complete.attr('id', 'complete');

            // Currently webkit doesn't use the size attr correctly. See:
            // https://code.google.com/p/chromium/issues/detail?id=4579
            this.sel = $('<select/>')
                .attr('tabindex', -1)
                .attr('multiple', 'true');
            this.complete.append(this.sel);
            this.visible = true;
            $('body').append(this.complete);

            //build the container
            var that = this;
            this.sel.dblclick(function () {
                that.pick();
            });
            this.sel.focus(function () {
                that.editor.focus();
            });
            this._handle_keydown = function (cm, event) {
                that.keydown(event);
            };
            this.editor.on('keydown', this._handle_keydown);
            this._handle_keypress = function (cm, event) {
                that.keypress(event);
            };
            this.editor.on('keypress', this._handle_keypress);
        }
        this.sel.attr('size', Math.min(10, this.raw_result.length));

        // After everything is on the page, compute the postion.
        // We put it above the code if it is too close to the bottom of the page.
        var pos = this.editor.cursorCoords(
            utils.from_absolute_cursor_pos(this.editor, start)
        );
        var left = pos.left-3;
        var top;
        var cheight = this.complete.height();
        var wheight = $(window).height();
        if (pos.bottom+cheight+5 > wheight) {
            top = pos.top-cheight-4;
        } else {
            top = pos.bottom+1;
        }
        this.complete.css('left', left + 'px');
        this.complete.css('top', top + 'px');

        // Clear and fill the list.
        this.sel.text('');
        this.build_gui_list(this.raw_result);
        return true;
    };

    Completer.prototype.insert = function (completion) {
        this.editor.replaceRange(completion.str, completion.from, completion.to);
    };

    Completer.prototype.build_gui_list = function (completions) {
        for (var i = 0; i < completions.length; ++i) {
            var opt = $('<option/>').text(completions[i].str).addClass(completions[i].type);
            this.sel.append(opt);
        }
        this.sel.children().first().attr('selected', 'true');
        this.sel.scrollTop(0);
    };

    Completer.prototype.close = function () {
        this.done = true;
        $('#complete').remove();
        this.editor.off('keydown', this._handle_keydown);
        this.editor.off('keypress', this._handle_keypress);
        this.visible = false;
    };

    Completer.prototype.pick = function () {
        this.insert(this.raw_result[this.sel[0].selectedIndex]);
        this.close();
    };

    Completer.prototype.keydown = function (event) {
        var code = event.keyCode;

        // Enter
        var options;
        var index;
        if (code == keycodes.enter) {
            event.codemirrorIgnore = true;
            event._ipkmIgnore = true;
            event.preventDefault();
            this.pick();
        // Escape or backspace
        } else if (code == keycodes.esc || code == keycodes.backspace) {
            event.codemirrorIgnore = true;
            event._ipkmIgnore = true;
            event.preventDefault();
            this.close();
        } else if (code == keycodes.tab) {
            //all the fastforwarding operation,
            //Check that shared start is not null which can append with prefixed completion
            // like %pylab , pylab have no shred start, and ff will result in py<tab><tab>
            // to erase py
            var sh = shared_start(this.raw_result, true);
            if (sh.str !== '') {
                this.insert(sh);
            }
            this.close();
            this.carry_on_completion();
        } else if (code == keycodes.up || code == keycodes.down) {
            // need to do that to be able to move the arrow
            // when on the first or last line ofo a code cell
            event.codemirrorIgnore = true;
            event._ipkmIgnore = true;
            event.preventDefault();

            options = this.sel.find('option');
            index = this.sel[0].selectedIndex;
            if (code == keycodes.up) {
                index--;
            }
            if (code == keycodes.down) {
                index++;
            }
            index = Math.min(Math.max(index, 0), options.length-1);
            this.sel[0].selectedIndex = index;
        } else if (code == keycodes.pageup || code == keycodes.pagedown) {
            event._ipkmIgnore = true;

            options = this.sel.find('option');
            index = this.sel[0].selectedIndex;
            if (code == keycodes.pageup) {
                index -= 10; // As 10 is the hard coded size of the drop down menu
            } else {
                index += 10;
            }
            index = Math.min(Math.max(index, 0), options.length-1);
            this.sel[0].selectedIndex = index;
        } else if (code == keycodes.left || code == keycodes.right) {
            this.close();
        }
    };

    Completer.prototype.keypress = function (event) {
        /**
         * FIXME: This is a band-aid.
         * on keypress, trigger insertion of a single character.
         * This simulates the old behavior of completion as you type,
         * before events were disconnected and CodeMirror stopped
         * receiving events while the completer is focused.
         */
        
        var that = this;
        var code = event.keyCode;
        
        // don't handle keypress if it's not a character (arrows on FF)
        // or ENTER/TAB
        if (event.charCode === 0 ||
            code == keycodes.tab ||
            code == keycodes.enter
        ) return;
        
        this.close();
        this.editor.focus();
        setTimeout(function () {
            that.carry_on_completion();
        }, 50);
    };

    exports.Completer = Completer;

},{"base/js/keyboard":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/keyboard.js","base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js","notebook/js/contexthint":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/contexthint.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/contexthint.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// highly adapted for codemiror jshint
    "use strict";

    var forEach = function(arr, f) {
        for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
    };

    var arrayContains = function(arr, item) {
        if (!Array.prototype.indexOf) {
            var i = arr.length;
            while (i--) {
                if (arr[i] === item) {
                    return true;
                }
            }
            return false;
        }
        return arr.indexOf(item) != -1;
    };

    CodeMirror.contextHint = function (editor) {
        // Find the token at the cursor
        var cur = editor.getCursor(),
            token = editor.getTokenAt(cur),
            tprop = token;
        // If it's not a 'word-style' token, ignore the token.
        // If it is a property, find out what it is a property of.
        var list = [];
        var clist = getCompletions(token, editor);
        for (var i = 0; i < clist.length; i++) {
            list.push({
                str: clist[i],
                type: "context",
                from: {
                    line: cur.line,
                    ch: token.start
                },
                to: {
                    line: cur.line,
                    ch: token.end
                }
            });
        }
        return list;
    };

    // find all 'words' of current cell
    var getAllTokens = function (editor) {
        var found = [];

        // add to found if not already in it


        function maybeAdd(str) {
            if (!arrayContains(found, str)) found.push(str);
        }

        // loop through all token on all lines
        var lineCount = editor.lineCount();
        // loop on line
        for (var l = 0; l < lineCount; l++) {
            var line = editor.getLine(l);
            //loop on char
            for (var c = 1; c < line.length; c++) {
                var tk = editor.getTokenAt({
                    line: l,
                    ch: c
                });
                // if token has a class, it has geat chances of beeing
                // of interest. Add it to the list of possible completions.
                // we could skip token of ClassName 'comment'
                // or 'number' and 'operator'
                if (tk.className !== null) {
                    maybeAdd(tk.string);
                }
                // jump to char after end of current token
                c = tk.end;
            }
        }
        return found;
    };

    var getCompletions = function(token, editor) {
        var candidates = getAllTokens(editor);
        // filter all token that have a common start (but nox exactly) the lenght of the current token
        var lambda = function (x) {
                return (x.indexOf(token.string) === 0 && x != token.string);
            };
        var filterd = candidates.filter(lambda);
        return filterd;
    };

    exports.contextHint = CodeMirror.contextHint;

},{}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/keyboardmanager.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 *
 *
 * @module keyboardmanager
 * @namespace keyboardmanager
 * @class KeyboardManager
 */
    "use strict";
    var utils = require('base/js/utils');
    var keyboard = require('base/js/keyboard');

    // Main keyboard manager for the notebook
    var keycodes = keyboard.keycodes;

    var KeyboardManager = function (options) {
        /**
         * A class to deal with keyboard event and shortcut
         *
         * @class KeyboardManager
         * @constructor
         * @param options {dict} Dictionary of keyword arguments :
         *    @param options.events {$(Events)} instance 
         *    @param options.pager: {Pager}  pager instance
         */
        this.mode = 'command';
        this.enabled = true;
        this.pager = options.pager;
        this.quick_help = undefined;
        this.notebook = undefined;
        this.last_mode = undefined;
        this.bind_events();
        this.env = {pager:this.pager};
        this.actions = options.actions;
        this.command_shortcuts = new keyboard.ShortcutManager(undefined, options.events, this.actions, this.env );
        this.command_shortcuts.add_shortcuts(this.get_default_common_shortcuts());
        this.command_shortcuts.add_shortcuts(this.get_default_command_shortcuts());
        this.edit_shortcuts = new keyboard.ShortcutManager(undefined, options.events, this.actions, this.env);
        this.edit_shortcuts.add_shortcuts(this.get_default_common_shortcuts());
        this.edit_shortcuts.add_shortcuts(this.get_default_edit_shortcuts());
        Object.seal(this);
    };




    /**
     * Return a dict of common shortcut
     * @method get_default_common_shortcuts
     *
     * @example Example of returned shortcut
     * ```
     * 'shortcut-key': 'action-name'
     * // a string representing the shortcut as dash separated value.
     * // e.g. 'shift' , 'shift-enter', 'cmd-t'
     *```
     */
    KeyboardManager.prototype.get_default_common_shortcuts = function() {
        return {
            'shift'       : 'ipython.ignore',
            'shift-enter' : 'ipython.run-select-next',
            'ctrl-enter'  : 'ipython.execute-in-place',
            'alt-enter'   : 'ipython.execute-and-insert-after',
            // cmd on mac, ctrl otherwise
            'cmdtrl-s'    : 'ipython.save-notebook',
        };
    };

    KeyboardManager.prototype.get_default_edit_shortcuts = function() {
        return {
            'cmdtrl-shift-p'      : 'ipython.command-palette',
            'esc'                 : 'ipython.go-to-command-mode',
            'ctrl-m'              : 'ipython.go-to-command-mode',
            'up'                  : 'ipython.move-cursor-up-or-previous-cell',
            'down'                : 'ipython.move-cursor-down-or-next-cell',
            'ctrl-shift--'        : 'ipython.split-cell-at-cursor',
            'ctrl-shift-subtract' : 'ipython.split-cell-at-cursor',
        };
    };

    KeyboardManager.prototype.get_default_command_shortcuts = function() {
        return {
            'cmdtrl-shift-p': 'ipython.command-palette',
            'shift-space': 'ipython.scroll-up',
            'shift-v' : 'ipython.paste-cell-before',
            'shift-m' : 'ipython.merge-selected-cells',
            'shift-o' : 'ipython.toggle-output-scrolling-selected-cell',
            'enter' : 'ipython.enter-edit-mode',
            'space' : 'ipython.scroll-down',
            'down' : 'ipython.select-next-cell',
            'i,i' : 'ipython.interrupt-kernel',
            '0,0' : 'ipython.restart-kernel',
            'd,d' : 'ipython.delete-cell',
            'esc': 'ipython.close-pager',
            'up' : 'ipython.select-previous-cell',
            'k' : 'ipython.select-previous-cell',
            'j' : 'ipython.select-next-cell',
            'shift-k': 'ipython.extend-selection-previous',
            'shift-j': 'ipython.extend-selection-next',
            'x' : 'ipython.cut-selected-cell',
            'c' : 'ipython.copy-selected-cell',
            'v' : 'ipython.paste-cell-after',
            'a' : 'ipython.insert-cell-before',
            'b' : 'ipython.insert-cell-after',
            'y' : 'ipython.change-selected-cell-to-code-cell',
            'm' : 'ipython.change-selected-cell-to-markdown-cell',
            'r' : 'ipython.change-selected-cell-to-raw-cell',
            '1' : 'ipython.change-selected-cell-to-heading-1',
            '2' : 'ipython.change-selected-cell-to-heading-2',
            '3' : 'ipython.change-selected-cell-to-heading-3',
            '4' : 'ipython.change-selected-cell-to-heading-4',
            '5' : 'ipython.change-selected-cell-to-heading-5',
            '6' : 'ipython.change-selected-cell-to-heading-6',
            'o' : 'ipython.toggle-output-visibility-selected-cell',
            's' : 'ipython.save-notebook',
            'l' : 'ipython.toggle-line-number-selected-cell',
            'h' : 'ipython.show-keyboard-shortcut-help-dialog',
            'z' : 'ipython.undo-last-cell-deletion',
            'q' : 'ipython.close-pager',
        };
    };

    KeyboardManager.prototype.bind_events = function () {
        var that = this;
        $(document).keydown(function (event) {
            if(event._ipkmIgnore===true||(event.originalEvent||{})._ipkmIgnore===true){
                return false;
            }
            return that.handle_keydown(event);
        });
    };

    KeyboardManager.prototype.set_notebook = function (notebook) {
        this.notebook = notebook;
        this.actions.extend_env({notebook:notebook});
    };

    KeyboardManager.prototype.set_quickhelp = function (notebook) {
        this.actions.extend_env({quick_help:notebook});
    };


    KeyboardManager.prototype.handle_keydown = function (event) {
        /**
         *  returning false from this will stop event propagation
         **/

        if (event.which === keycodes.esc) {
            // Intercept escape at highest level to avoid closing
            // websocket connection with firefox
            event.preventDefault();
        }
        
        if (!this.enabled) {
            if (event.which === keycodes.esc) {
                this.notebook.command_mode();
                return false;
            }
            return true;
        }
        
        if (this.mode === 'edit') {
            return this.edit_shortcuts.call_handler(event);
        } else if (this.mode === 'command') {
            return this.command_shortcuts.call_handler(event);
        }
        return true;
    };

    KeyboardManager.prototype.edit_mode = function () {
        this.last_mode = this.mode;
        this.mode = 'edit';
    };

    KeyboardManager.prototype.command_mode = function () {
        this.last_mode = this.mode;
        this.mode = 'command';
    };

    KeyboardManager.prototype.enable = function () {
        this.enabled = true;
    };

    KeyboardManager.prototype.disable = function () {
        this.enabled = false;
    };

    KeyboardManager.prototype.register_events = function (e) {
        e = $(e);
        var that = this;
        var handle_focus = function () {
            that.disable();
        };
        var handle_blur = function () {
            that.enable();
        };
        e.on('focusin', handle_focus);
        e.on('focusout', handle_blur);
        // TODO: Very strange. The focusout event does not seem fire for the 
        // bootstrap textboxes on FF25&26...  This works around that by 
        // registering focus and blur events recursively on all inputs within
        // registered element.
        e.find('input').blur(handle_blur);
        e.on('DOMNodeInserted', function (event) {
            var target = $(event.target);
            if (target.is('input')) {
                target.blur(handle_blur);
            } else {
                target.find('input').blur(handle_blur);    
            }
          });
        // There are times (raw_input) where we remove the element from the DOM before
        // focusout is called. In this case we bind to the remove event of jQueryUI,
        // which gets triggered upon removal, iff it is focused at the time.
        // is_focused must be used to check for the case where an element within
        // the element being removed is focused.
        e.on('remove', function () {
            if (utils.is_focused(e[0])) {
                that.enable();
            }
        });
    };

    exports.KeyboardManager = KeyboardManager;

},{"base/js/keyboard":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/keyboard.js","base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/maintoolbar.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var toolbar = require('./toolbar');
    var celltoolbar = require('./celltoolbar');
    var MainToolBar = function (selector, options) {
        /**
         * Constructor
         *
         * Parameters:
         *  selector: string
         *  options: dictionary
         *      Dictionary of keyword arguments.
         *          events: $(Events) instance
         *          notebook: Notebook instance
         **/
        toolbar.ToolBar.apply(this, [selector, options] );
        this.events = options.events;
        this.notebook = options.notebook;
        this._make();
        Object.seal(this);
    };

    MainToolBar.prototype = Object.create(toolbar.ToolBar.prototype);

    MainToolBar.prototype._make = function () {
        var grps = [
          [
            ['ipython.save-notebook'],
            'save-notbook'
          ],
          [
            ['ipython.insert-cell-after'],
            'insert_above_below'],
          [
            ['ipython.cut-selected-cell',
             'ipython.copy-selected-cell',
             'ipython.paste-cell-after'
            ] ,
            'cut_copy_paste'],
          [
            ['ipython.move-selected-cell-up',
             'ipython.move-selected-cell-down'
            ],
            'move_up_down'],
          [ ['ipython.run-select-next',
             'ipython.interrupt-kernel',
             'ipython.restart-kernel'
            ],
            'run_int'],
         ['<add_celltype_list>'],
         ['<add_celltoolbar_list>'],
         [['ipython.command-palette']]
        ];
        this.construct(grps);
    };

    // add a cell type drop down to the maintoolbar.
    // triggered when the pseudo action `<add_celltype_list>` is
    // encountered when building a toolbar.
    MainToolBar.prototype._pseudo_actions.add_celltype_list = function () {
        var that = this;
        var sel = $('<select/>')
            .attr('id','cell_type')
            .addClass('form-control select-xs')
            .append($('<option/>').attr('value','code').text('Code'))
            .append($('<option/>').attr('value','markdown').text('Markdown'))
            .append($('<option/>').attr('value','raw').text('Raw NBConvert'))
            .append($('<option/>').attr('value','heading').text('Heading'));
        this.notebook.keyboard_manager.register_events(sel);
        this.events.on('selected_cell_type_changed.Notebook', function (event, data) {
            if (data.cell_type === 'heading') {
                sel.val('Markdown');
            } else {
                sel.val(data.cell_type);
            }
        });
        sel.change(function () {
            var cell_type = $(this).val();
            switch (cell_type) {
            case 'code':
                that.notebook.to_code();
                break;
            case 'markdown':
                that.notebook.to_markdown();
                break;
            case 'raw':
                that.notebook.to_raw();
                break;
            case 'heading':
                that.notebook._warn_heading();
                that.notebook.to_heading();
                sel.val('markdown');
                break;
            default:
                console.log("unrecognized cell type:", cell_type);
            }
            that.notebook.focus_cell();
        });
        return sel;

    };

    MainToolBar.prototype._pseudo_actions.add_celltoolbar_list = function () {
        var label = $('<span/>').addClass("navbar-text").text('Cell Toolbar:');
        var select = $('<select/>')
            .attr('id', 'ctb_select')
            .addClass('form-control select-xs')
            .append($('<option/>').attr('value', '').text('None'));
        var that = this;
        select.change(function() {
                var val = $(this).val();
                if (val ==='') {
                    celltoolbar.CellToolbar.global_hide();
                    delete that.notebook.metadata.celltoolbar;
                } else {
                    celltoolbar.CellToolbar.global_show();
                    celltoolbar.CellToolbar.activate_preset(val, that.events);
                    that.notebook.metadata.celltoolbar = val;
                }
                that.notebook.focus_cell();
            });
        this.notebook.keyboard_manager.register_events(select);
        // Setup the currently registered presets.
        var presets = celltoolbar.CellToolbar.list_presets();
        for (var i=0; i<presets.length; i++) {
            var name = presets[i];
            select.append($('<option/>').attr('value', name).text(name));
        }
        // Setup future preset registrations.
        this.events.on('preset_added.CellToolbar', function (event, data) {
            var name = data.name;
            select.append($('<option/>').attr('value', name).text(name));
        });
        this.events.on('unregistered_preset.CellToolbar', function (event, data) {
            if (select.val() === data.name){
                select.val('');
                celltoolbar.CellToolbar.global_hide();
                delete that.notebook.metadata.celltoolbar;
            }
            select.find("option[value='"+name+"']" ).remove();
        });
        // Update select value when a preset is activated.
        this.events.on('preset_activated.CellToolbar', function (event, data) {
            if (select.val() !== data.name){
                select.val(data.name);
            }
        });

        var wrapper = $('<div/>').addClass('btn-group');
        wrapper.append(label).append(select);
        return wrapper;
    };

    exports.MainToolBar = MainToolBar;

},{"./celltoolbar":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/celltoolbar.js","./toolbar":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/toolbar.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/mathjaxutils.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var utils = require('base/js/utils');
    var dialog = require('base/js/dialog');

    var init = function () {
        if (window.MathJax) {
            // MathJax loaded
            MathJax.Hub.Config({
                tex2jax: {
                    inlineMath: [ ['$','$'], ["\\(","\\)"] ],
                    displayMath: [ ['$$','$$'], ["\\[","\\]"] ],
                    processEscapes: true,
                    processEnvironments: true
                },
                // Center justify equations in code and markdown cells. Elsewhere
                // we use CSS to left justify single line equations in code cells.
                displayAlign: 'center',
                "HTML-CSS": {
                    availableFonts: [],
                    imageFont: null,
                    preferredFont: null,
                    webFont: "STIX-Web",
                    styles: {'.MathJax_Display': {"margin": 0}},
                    linebreaks: { automatic: true }
                }
            });
            MathJax.Hub.Configured();
        } else if (window.mathjax_url !== "") {
            // Don't have MathJax, but should. Show dialog.
            dialog.modal({
                title : "Failed to retrieve MathJax from '" + window.mathjax_url + "'",
                body : $("<p/>").addClass('dialog').text(
                        "Math/LaTeX rendering will be disabled."
                    ),
                buttons : {
                    OK : {class: "btn-danger"}
                }
            });
        }
    };

    // Some magic for deferring mathematical expressions to MathJax
    // by hiding them from the Markdown parser.
    // Some of the code here is adapted with permission from Davide Cervone
    // under the terms of the Apache2 license governing the MathJax project.
    // Other minor modifications are also due to StackExchange and are used with
    // permission.

    var inline = "$"; // the inline math delimiter

    // MATHSPLIT contains the pattern for math delimiters and special symbols
    // needed for searching for math in the text input.
    var MATHSPLIT = /(\$\$?|\\(?:begin|end)\{[a-z]*\*?\}|\\[\\{}$]|[{}]|(?:\n\s*)+|@@\d+@@)/i;

    //  The math is in blocks i through j, so
    //    collect it into one block and clear the others.
    //  Replace &, <, and > by named entities.
    //  For IE, put <br> at the ends of comments since IE removes \n.
    //  Clear the current math positions and store the index of the
    //    math, then push the math string onto the storage array.
    //  The preProcess function is called on all blocks if it has been passed in
    var process_math = function (i, j, pre_process, math, blocks) {
        var block = blocks.slice(i, j + 1).join("").replace(/&/g, "&amp;") // use HTML entity for &
        .replace(/</g, "&lt;") // use HTML entity for <
        .replace(/>/g, "&gt;") // use HTML entity for >
        ;
        if (utils.browser === 'msie') {
            block = block.replace(/(%[^\n]*)\n/g, "$1<br/>\n");
        }
        while (j > i) {
            blocks[j] = "";
            j--;
        }
        blocks[i] = "@@" + math.length + "@@"; // replace the current block text with a unique tag to find later
        if (pre_process){
            block = pre_process(block);
        }
        math.push(block);
        return blocks;
    };

    //  Break up the text into its component parts and search
    //    through them for math delimiters, braces, linebreaks, etc.
    //  Math delimiters must match and braces must balance.
    //  Don't allow math to pass through a double linebreak
    //    (which will be a paragraph).
    //
    var remove_math = function (text) {
        var math = []; // stores math strings for later
        var start;
        var end;
        var last;
        var braces;

        // Except for extreme edge cases, this should catch precisely those pieces of the markdown
        // source that will later be turned into code spans. While MathJax will not TeXify code spans,
        // we still have to consider them at this point; the following issue has happened several times:
        //
        //     `$foo` and `$bar` are varibales.  -->  <code>$foo ` and `$bar</code> are variables.

        var hasCodeSpans = /`/.test(text),
            de_tilde;
        if (hasCodeSpans) {
            text = text.replace(/~/g, "~T").replace(/(^|[^\\])(`+)([^\n]*?[^`\n])\2(?!`)/gm, function (wholematch) {
                return wholematch.replace(/\$/g, "~D");
            });
            de_tilde = function (text) {
                return text.replace(/~([TD])/g, function (wholematch, character) {
                                                    return { T: "~", D: "$" }[character];
                                                });
            };
        } else {
            de_tilde = function (text) { return text; };
        }

        var blocks = utils.regex_split(text.replace(/\r\n?/g, "\n"),MATHSPLIT);

        for (var i = 1, m = blocks.length; i < m; i += 2) {
            var block = blocks[i];
            if (block.charAt(0) === "@") {
                //
                //  Things that look like our math markers will get
                //  stored and then retrieved along with the math.
                //
                blocks[i] = "@@" + math.length + "@@";
                math.push(block);
            }
            else if (start) {
                //
                //  If we are in math, look for the end delimiter,
                //    but don't go past double line breaks, and
                //    and balance braces within the math.
                //
                if (block === end) {
                    if (braces) {
                        last = i;
                    }
                    else {
                        blocks = process_math(start, i, de_tilde, math, blocks);
                        start  = null;
                        end    = null;
                        last   = null;
                    }
                }
                else if (block.match(/\n.*\n/)) {
                    if (last) {
                        i = last;
                        blocks = process_math(start, i, de_tilde, math, blocks);
                    }
                    start = null;
                    end = null;
                    last = null;
                    braces = 0;
                }
                else if (block === "{") {
                    braces++;
                }
                else if (block === "}" && braces) {
                    braces--;
                }
            }
            else {
                //
                //  Look for math start delimiters and when
                //    found, set up the end delimiter.
                //
                if (block === inline || block === "$$") {
                    start = i;
                    end = block;
                    braces = 0;
                }
                else if (block.substr(1, 5) === "begin") {
                    start = i;
                    end = "\\end" + block.substr(6);
                    braces = 0;
                }
            }
        }
        if (last) {
            blocks = process_math(start, last, de_tilde, math, blocks);
            start  = null;
            end    = null;
            last   = null;
        }
        return [de_tilde(blocks.join("")), math];
    };

    //
    //  Put back the math strings that were saved,
    //    and clear the math array (no need to keep it around).
    //
    var replace_math = function (text, math) {
        text = text.replace(/@@(\d+)@@/g, function (match, n) {
            return math[n];
        });
        return text;
    };

    module.exports = {
        init : init,
        remove_math : remove_math,
        replace_math : replace_math
    };

},{"base/js/dialog":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/dialog.js","base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/menubar.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var IPython = require('base/js/namespace');
    var dialog = require('base/js/dialog');
    var utils = require('base/js/utils');
    var tour = require('notebook/js/tour');
    var moment = require('moment');

    var MenuBar = function (selector, options) {
        /**
         * Constructor
         *
         * A MenuBar Class to generate the menubar of Jupyter notebook
         *
         * Parameters:
         *  selector: string
         *  options: dictionary
         *      Dictionary of keyword arguments.
         *          notebook: Notebook instance
         *          contents: ContentManager instance
         *          events: $(Events) instance
         *          save_widget: SaveWidget instance
         *          quick_help: QuickHelp instance
         *          base_url : string
         *          notebook_path : string
         *          notebook_name : string
         */
        options = options || {};
        this.base_url = options.base_url || utils.get_body_data("baseUrl");
        this.selector = selector;
        this.notebook = options.notebook;
        this.contents = options.contents;
        this.events = options.events;
        this.save_widget = options.save_widget;
        this.quick_help = options.quick_help;

        try {
            this.tour = new tour.NotebookTour(this.notebook, this.events);
        } catch (e) {
            this.tour = undefined;
            console.log("Failed to instantiate Notebook Tour", e);
        }

        if (this.selector !== undefined) {
            this.element = $(selector);
            this.style();
            this.bind_events();
        }
    };

    // TODO: This has definitively nothing to do with style ...
    MenuBar.prototype.style = function () {
        var that = this;
        this.element.find("li").click(function (event, ui) {
                // The selected cell loses focus when the menu is entered, so we
                // re-select it upon selection.
                var i = that.notebook.get_selected_index();
                that.notebook.select(i);
            }
        );
    };

    MenuBar.prototype._nbconvert = function (format, download) {
        download = download || false;
        var notebook_path = this.notebook.notebook_path;
        var url = utils.url_join_encode(
            this.base_url,
            'nbconvert',
            format,
            notebook_path
        ) + "?download=" + download.toString();
        
        var w = window.open('', IPython._target);
        if (this.notebook.dirty) {
            this.notebook.save_notebook().then(function() {
                w.location = url;
            });
        } else {
            w.location = url;
        }
    };

    MenuBar.prototype._size_header = function() {
        /** 
         * Update header spacer size.
         */
        this.events.trigger('resize-header.Page');
    };

    MenuBar.prototype.bind_events = function () {
        /**
         *  File
         */
        var that = this;
        
        this.element.find('#open_notebook').click(function () {
            var parent = utils.url_path_split(that.notebook.notebook_path)[0];
            window.open(utils.url_join_encode(that.base_url, 'tree', parent), IPython._target);
        });
        this.element.find('#copy_notebook').click(function () {
            if (that.notebook.dirty) {
                that.notebook.save_notebook({async : false});
            }
            that.notebook.copy_notebook();
            return false;
        });
        this.element.find('#download_ipynb').click(function () {
            var base_url = that.notebook.base_url;
            var notebook_path = that.notebook.notebook_path;
            var w = window.open('');
            var url = utils.url_join_encode(base_url, 'files', notebook_path)
                                + '?download=1';
            if (that.notebook.dirty) {
                that.notebook.save_notebook().then(function() {
                    w.location = url;
                });
            } else {
                w.location = url;
            }
        });
        
        this.element.find('#print_preview').click(function () {
            that._nbconvert('html', false);
        });

        this.element.find('#download_html').click(function () {
            that._nbconvert('html', true);
        });

        this.element.find('#download_markdown').click(function () {
            that._nbconvert('markdown', true);
        });

        this.element.find('#download_rst').click(function () {
            that._nbconvert('rst', true);
        });

        this.element.find('#download_pdf').click(function () {
            that._nbconvert('pdf', true);
        });

        this.element.find('#download_script').click(function () {
            that._nbconvert('script', true);
        });

        this.element.find('#rename_notebook').click(function () {
            that.save_widget.rename_notebook({notebook: that.notebook});
        });

        this.element.find('#save_checkpoint').click(function () {
            that.notebook.save_checkpoint();
        });

        this.element.find('#restore_checkpoint').click(function () {
        });

        this.element.find('#trust_notebook').click(function () {
            that.notebook.trust_notebook();
        });
        this.events.on('trust_changed.Notebook', function (event, trusted) {
            if (trusted) {
                that.element.find('#trust_notebook')
                    .addClass("disabled").off('click')
                    .find("a").text("Trusted Notebook");
            } else {
                that.element.find('#trust_notebook')
                    .removeClass("disabled").on('click', function () {
                        that.notebook.trust_notebook();
                    })
                    .find("a").text("Trust Notebook");
            }
        });

        this.element.find('#kill_and_exit').click(function () {
            var close_window = function () {
                /**
                 * allow closing of new tabs in Chromium, impossible in FF
                 */
                window.open('', '_self', '');
                window.close();
            };
            // finish with close on success or failure
            that.notebook.session.delete(close_window, close_window);
        });

        // Edit
        this.element.find('#cut_cell').click(function () {
            that.notebook.cut_cell();
        });
        this.element.find('#copy_cell').click(function () {
            that.notebook.copy_cell();
        });
        this.element.find('#delete_cell').click(function () {
            that.notebook.delete_cell();
        });
        this.element.find('#undelete_cell').click(function () {
            that.notebook.undelete_cell();
        });
        this.element.find('#split_cell').click(function () {
            that.notebook.split_cell();
        });
        this.element.find('#merge_cell_above').click(function () {
            that.notebook.merge_cell_above();
        });
        this.element.find('#merge_cell_below').click(function () {
            that.notebook.merge_cell_below();
        });
        this.element.find('#move_cell_up').click(function () {
            that.notebook.move_cell_up();
        });
        this.element.find('#move_cell_down').click(function () {
            that.notebook.move_cell_down();
        });
        this.element.find('#edit_nb_metadata').click(function () {
            that.notebook.edit_metadata({
                notebook: that.notebook,
                keyboard_manager: that.notebook.keyboard_manager});
        });
        
        // View
        this.element.find('#toggle_header').click(function () {
            $('#header-container').toggle();
            $('.header-bar').toggle();
            that._size_header();
        });
        this.element.find('#toggle_toolbar').click(function () {
            $('div#maintoolbar').toggle();
            that._size_header();
        });
        // Insert
        this.element.find('#insert_cell_above').click(function () {
            that.notebook.insert_cell_above('code');
            that.notebook.select_prev();
        });
        this.element.find('#insert_cell_below').click(function () {
            that.notebook.insert_cell_below('code');
            that.notebook.select_next();
        });
        // Cell
        this.element.find('#run_cell').click(function () {
            that.notebook.execute_cell();
        });
        this.element.find('#run_cell_select_below').click(function () {
            that.notebook.execute_cell_and_select_below();
        });
        this.element.find('#run_cell_insert_below').click(function () {
            that.notebook.execute_cell_and_insert_below();
        });
        this.element.find('#run_all_cells').click(function () {
            that.notebook.execute_all_cells();
        });
        this.element.find('#run_all_cells_above').click(function () {
            that.notebook.execute_cells_above();
        });
        this.element.find('#run_all_cells_below').click(function () {
            that.notebook.execute_cells_below();
        });
        this.element.find('#to_code').click(function () {
            that.notebook.to_code();
        });
        this.element.find('#to_markdown').click(function () {
            that.notebook.to_markdown();
        });
        this.element.find('#to_raw').click(function () {
            that.notebook.to_raw();
        });
        
        this.element.find('#toggle_current_output').click(function () {
            that.notebook.toggle_output();
        });
        this.element.find('#toggle_current_output_scroll').click(function () {
            that.notebook.toggle_output_scroll();
        });
        this.element.find('#clear_current_output').click(function () {
            that.notebook.clear_output();
        });
        
        this.element.find('#toggle_all_output').click(function () {
            that.notebook.toggle_all_output();
        });
        this.element.find('#toggle_all_output_scroll').click(function () {
            that.notebook.toggle_all_output_scroll();
        });
        this.element.find('#clear_all_output').click(function () {
            that.notebook.clear_all_output();
        });
        
        // Kernel
        this.element.find('#int_kernel').click(function () {
            that.notebook.kernel.interrupt();
        });
        this.element.find('#restart_kernel').click(function () {
            that.notebook.restart_kernel();
        });
        this.element.find('#reconnect_kernel').click(function () {
            that.notebook.kernel.reconnect();
        });
        // Help
        if (this.tour) {
            this.element.find('#notebook_tour').click(function () {
                that.tour.start();
            });
        } else {
            this.element.find('#notebook_tour').addClass("disabled");
        }
        this.element.find('#keyboard_shortcuts').click(function () {
            that.quick_help.show_keyboard_shortcuts();
        });
        
        this.update_restore_checkpoint(null);
        
        this.events.on('checkpoints_listed.Notebook', function (event, data) {
            that.update_restore_checkpoint(that.notebook.checkpoints);
        });
        
        this.events.on('checkpoint_created.Notebook', function (event, data) {
            that.update_restore_checkpoint(that.notebook.checkpoints);
        });
        
        this.events.on('notebook_loaded.Notebook', function() {
            var langinfo = that.notebook.metadata.language_info || {};
            that.update_nbconvert_script(langinfo);
        });
        
        this.events.on('kernel_ready.Kernel', function(event, data) {
            var langinfo = data.kernel.info_reply.language_info || {};
            that.update_nbconvert_script(langinfo);
            that.add_kernel_help_links(data.kernel.info_reply.help_links || []);
        });
    };

    MenuBar.prototype.update_restore_checkpoint = function(checkpoints) {
        var ul = this.element.find("#restore_checkpoint").find("ul");
        ul.empty();
        if (!checkpoints || checkpoints.length === 0) {
            ul.append(
                $("<li/>")
                .addClass("disabled")
                .append(
                    $("<a/>")
                    .text("No checkpoints")
                )
            );
            return;
        }
        
        var that = this;
        checkpoints.map(function (checkpoint) {
            var d = new Date(checkpoint.last_modified);
            ul.append(
                $("<li/>").append(
                    $("<a/>")
                    .attr("href", "#")
                    .text(moment(d).format("LLLL"))
                    .click(function () {
                        that.notebook.restore_checkpoint_dialog(checkpoint);
                    })
                )
            );
        });
    };

    MenuBar.prototype.update_nbconvert_script = function(langinfo) {
        /**
         * Set the 'Download as foo' menu option for the relevant language.
         */
        var el = this.element.find('#download_script');
        
        // Set menu entry text to e.g. "Python (.py)"
        var langname = (langinfo.name || 'Script');
        langname = langname.charAt(0).toUpperCase()+langname.substr(1); // Capitalise
        el.find('a').text(langname + ' ('+(langinfo.file_extension || 'txt')+')');
    };

    MenuBar.prototype.add_kernel_help_links = function(help_links) {
        /** add links from kernel_info to the help menu */
        var divider = $("#kernel-help-links");
        if (divider.length === 0) {
            // insert kernel help section above about link
            var about = $("#notebook_about").parent();
            divider = $("<li>")
                .attr('id', "kernel-help-links")
                .addClass('divider');
            about.prev().before(divider);
        }
        // remove previous entries
        while (!divider.next().hasClass('divider')) {
            divider.next().remove();
        }
        if (help_links.length === 0) {
            // no help links, remove the divider
            divider.remove();
            return;
        }
        var cursor = divider;
        help_links.map(function (link) {
            cursor.after($("<li>")
                .append($("<a>")
                    .attr('target', '_blank')
                    .attr('title', 'Opens in a new window')
                    .attr('href', link.url)
                    .append($("<i>")
                        .addClass("fa fa-external-link menu-icon pull-right")
                    )
                    .append($("<span>")
                        .text(link.text)
                    )
                )
            );
            cursor = cursor.next();
        });
        
    };

    exports.MenuBar = MenuBar;

},{"base/js/dialog":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/dialog.js","base/js/namespace":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/namespace.js","base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js","moment":"/Users/jon/jupyter/notebook/node_modules/moment/moment.js","notebook/js/tour":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/tour.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/notebook.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * @module notebook
 */
    "use strict";

    var IPython = require('base/js/namespace');
    var utils = require('base/js/utils');
    var dialog = require('base/js/dialog');
    var cellmod = require('notebook/js/cell');
    var textcell = require('notebook/js/textcell');
    var codecell = require('notebook/js/codecell');
    var moment = require('moment');
    var configmod = require('services/config');
    var session = require('services/sessions/session');
    var celltoolbar = require('notebook/js/celltoolbar');
    var marked = require('marked');
    var mathjaxutils = require('notebook/js/mathjaxutils');
    var keyboard = require('base/js/keyboard');
    var tooltip = require('notebook/js/tooltip');
    var default_celltoolbar = require('notebook/js/celltoolbarpresets/default');
    var rawcell_celltoolbar = require('notebook/js/celltoolbarpresets/rawcell');
    var slideshow_celltoolbar = require('notebook/js/celltoolbarpresets/slideshow');
    var scrollmanager = require('notebook/js/scrollmanager');
    var commandpalette = require('notebook/js/commandpalette');

    /**
     * Contains and manages cells.
     * @class Notebook
     * @param {string}          selector
     * @param {object}          options - Dictionary of keyword arguments.  
     * @param {jQuery}          options.events - selector of Events
     * @param {KeyboardManager} options.keyboard_manager
     * @param {Contents}        options.contents
     * @param {SaveWidget}      options.save_widget
     * @param {object}          options.config
     * @param {string}          options.base_url
     * @param {string}          options.notebook_path
     * @param {string}          options.notebook_name
     */
    var Notebook = function (selector, options) {
        this.config = options.config;
        this.class_config = new configmod.ConfigWithDefaults(this.config, 
                                        Notebook.options_default, 'Notebook');
        this.base_url = options.base_url;
        this.notebook_path = options.notebook_path;
        this.notebook_name = options.notebook_name;
        this.events = options.events;
        this.keyboard_manager = options.keyboard_manager;
        this.contents = options.contents;
        this.save_widget = options.save_widget;
        this.tooltip = new tooltip.Tooltip(this.events);
        this.ws_url = options.ws_url;
        this._session_starting = false;
        this.last_modified = null;

        //  Create default scroll manager.
        this.scroll_manager = new scrollmanager.ScrollManager(this);

        // TODO: This code smells (and the other `= this` line a couple lines down)
        // We need a better way to deal with circular instance references.
        this.keyboard_manager.notebook = this;
        this.save_widget.notebook = this;
        
        mathjaxutils.init();

        if (marked) {
            marked.setOptions({
                gfm : true,
                tables: true,
                // FIXME: probably want central config for CodeMirror theme when we have js config
                langPrefix: "cm-s-ipython language-",
                highlight: function(code, lang, callback) {
                    if (!lang) {
                        // no language, no highlight
                        if (callback) {
                            callback(null, code);
                            return;
                        } else {
                            return code;
                        }
                    }
                    utils.requireCodeMirrorMode(lang, function (spec) {
                        var el = document.createElement("div");
                        var mode = CodeMirror.getMode({}, spec);
                        if (!mode) {
                            console.log("No CodeMirror mode: " + lang);
                            callback(null, code);
                            return;
                        }
                        try {
                            CodeMirror.runMode(code, spec, el);
                            callback(null, el.innerHTML);
                        } catch (err) {
                            console.log("Failed to highlight " + lang + " code", err);
                            callback(err, code);
                        }
                    }, function (err) {
                        console.log("No CodeMirror mode: " + lang);
                        callback(err, code);
                    });
                }
            });
        }

        this.element = $(selector);
        this.element.scroll();
        this.element.data("notebook", this);
        this.next_prompt_number = 1;
        this.session = null;
        this.kernel = null;
        this.kernel_busy = false;
        this.clipboard = null;
        this.undelete_backup = null;
        this.undelete_index = null;
        this.undelete_below = false;
        this.paste_enabled = false;
        this.writable = false;
        // It is important to start out in command mode to match the intial mode
        // of the KeyboardManager.
        this.mode = 'command';
        this.set_dirty(false);
        this.metadata = {};
        this._checkpoint_after_save = false;
        this.last_checkpoint = null;
        this.checkpoints = [];
        this.autosave_interval = 0;
        this.autosave_timer = null;
        // autosave *at most* every two minutes
        this.minimum_autosave_interval = 120000;
        this.notebook_name_blacklist_re = /[\/\\:]/;
        this.nbformat = 4; // Increment this when changing the nbformat
        this.nbformat_minor = this.current_nbformat_minor = 0; // Increment this when changing the nbformat
        this.codemirror_mode = 'text';
        this.create_elements();
        this.bind_events();
        this.kernel_selector = null;
        this.dirty = null;
        this.trusted = null;
        this._fully_loaded = false;

        // Trigger cell toolbar registration.
        default_celltoolbar.register(this);
        rawcell_celltoolbar.register(this);
        slideshow_celltoolbar.register(this);

        // prevent assign to miss-typed properties.
        Object.seal(this);
    };

    Notebook.options_default = {
        // can be any cell type, or the special values of
        // 'above', 'below', or 'selected' to get the value from another cell.
        default_cell_type: 'code'
    };

    /**
     * Create an HTML and CSS representation of the notebook.
     */
    Notebook.prototype.create_elements = function () {
        var that = this;
        this.element.attr('tabindex','-1');
        this.container = $("<div/>").addClass("container").attr("id", "notebook-container");
        // We add this end_space div to the end of the notebook div to:
        // i) provide a margin between the last cell and the end of the notebook
        // ii) to prevent the div from scrolling up when the last cell is being
        // edited, but is too low on the page, which browsers will do automatically.
        var end_space = $('<div/>')
            .addClass('end_space');
        end_space.dblclick(function (e) {
            var ncells = that.ncells();
            that.insert_cell_below('code',ncells-1);
        });
        this.element.append(this.container);
        this.container.after(end_space);
    };

    /**
     * Bind JavaScript events: key presses and custom Jupyter events.
     */
    Notebook.prototype.bind_events = function () {
        var that = this;

        this.events.on('set_next_input.Notebook', function (event, data) {
            if (data.replace) {
                data.cell.set_text(data.text);
                data.cell.clear_output();
            } else {
                var index = that.find_cell_index(data.cell);
                var new_cell = that.insert_cell_below('code',index);
                new_cell.set_text(data.text);
            }
            that.dirty = true;
        });

        this.events.on('unrecognized_cell.Cell', function () {
            that.warn_nbformat_minor();
        });

        this.events.on('unrecognized_output.OutputArea', function () {
            that.warn_nbformat_minor();
        });

        this.events.on('set_dirty.Notebook', function (event, data) {
            that.dirty = data.value;
        });

        this.events.on('trust_changed.Notebook', function (event, trusted) {
            that.trusted = trusted;
        });

        this.events.on('select.Cell', function (event, data) {
            var index = that.find_cell_index(data.cell);
            that.select(index);
        });

        this.events.on('edit_mode.Cell', function (event, data) {
            that.handle_edit_mode(data.cell);
        });

        this.events.on('command_mode.Cell', function (event, data) {
            that.handle_command_mode(data.cell);
        });
        
        this.events.on('spec_changed.Kernel', function(event, data) {
            that.metadata.kernelspec = {
                name: data.name,
                display_name: data.spec.display_name,
                language: data.spec.language,
            };
            // start session if the current session isn't already correct
            if (!(that.session && that.session.kernel && that.session.kernel.name === data.name)) {
                that.start_session(data.name);
            }
        });

        this.events.on('kernel_ready.Kernel', function(event, data) {
            var kinfo = data.kernel.info_reply;
            if (!kinfo.language_info) {
                delete that.metadata.language_info;
                return;
            }
            var langinfo = kinfo.language_info;
            that.metadata.language_info = langinfo;
            // Mode 'null' should be plain, unhighlighted text.
            var cm_mode = langinfo.codemirror_mode || langinfo.name || 'null';
            that.set_codemirror_mode(cm_mode);
        });
        
        this.events.on('kernel_idle.Kernel', function () {
            that.kernel_busy = false;
        });
        
        this.events.on('kernel_busy.Kernel', function () {
            that.kernel_busy = true;
        });

        var collapse_time = function (time) {
            var app_height = $('#ipython-main-app').height(); // content height
            var splitter_height = $('div#pager_splitter').outerHeight(true);
            var new_height = app_height - splitter_height;
            that.element.animate({height : new_height + 'px'}, time);
        };

        this.element.bind('collapse_pager', function (event, extrap) {
            var time = (extrap !== undefined) ? ((extrap.duration !== undefined ) ? extrap.duration : 'fast') : 'fast';
            collapse_time(time);
        });

        var expand_time = function (time) {
            var app_height = $('#ipython-main-app').height(); // content height
            var splitter_height = $('div#pager_splitter').outerHeight(true);
            var pager_height = $('div#pager').outerHeight(true);
            var new_height = app_height - pager_height - splitter_height;
            that.element.animate({height : new_height + 'px'}, time);
        };

        this.element.bind('expand_pager', function (event, extrap) {
            var time = (extrap !== undefined) ? ((extrap.duration !== undefined ) ? extrap.duration : 'fast') : 'fast';
            expand_time(time);
        });

        // Firefox 22 broke $(window).on("beforeunload")
        // I'm not sure why or how.
        window.onbeforeunload = function (e) {
            // TODO: Make killing the kernel configurable.
            var kill_kernel = false;
            if (kill_kernel) {
                that.session.delete();
            }
            // if we are autosaving, trigger an autosave on nav-away.
            // still warn, because if we don't the autosave may fail.
            if (that.dirty) {
                if ( that.autosave_interval ) {
                    // schedule autosave in a timeout
                    // this gives you a chance to forcefully discard changes
                    // by reloading the page if you *really* want to.
                    // the timer doesn't start until you *dismiss* the dialog.
                    setTimeout(function () {
                        if (that.dirty) {
                            that.save_notebook();
                        }
                    }, 1000);
                    return "Autosave in progress, latest changes may be lost.";
                } else {
                    return "Unsaved changes will be lost.";
                }
            }
            // if the kernel is busy, prompt the user if he’s sure
            if (that.kernel_busy) {
                return "The Kernel is busy, outputs may be lost.";
            }
            // IE treats null as a string.  Instead just return which will avoid the dialog.
            return;
        };
    };

    Notebook.prototype.show_command_palette = function() {
        var x = new commandpalette.CommandPalette(this);
    }

    /**
     * Trigger a warning dialog about missing functionality from newer minor versions
     */
    Notebook.prototype.warn_nbformat_minor = function (event) {
        var v = 'v' + this.nbformat + '.';
        var orig_vs = v + this.nbformat_minor;
        var this_vs = v + this.current_nbformat_minor;
        var msg = "This notebook is version " + orig_vs + ", but we only fully support up to " +
        this_vs + ".  You can still work with this notebook, but cell and output types " +
        "introduced in later notebook versions will not be available.";

        dialog.modal({
            notebook: this,
            keyboard_manager: this.keyboard_manager,
            title : "Newer Notebook",
            body : msg,
            buttons : {
                OK : {
                    "class" : "btn-danger"
                }
            }
        });
    };

    /**
     * Set the dirty flag, and trigger the set_dirty.Notebook event
     */
    Notebook.prototype.set_dirty = function (value) {
        if (value === undefined) {
            value = true;
        }
        if (this.dirty === value) {
            return;
        }
        this.events.trigger('set_dirty.Notebook', {value: value});
    };

    /**
     * Scroll the top of the page to a given cell.
     * 
     * @param {integer}  index - An index of the cell to view
     * @param {integer}  time - Animation time in milliseconds
     * @return {integer} Pixel offset from the top of the container
     */
    Notebook.prototype.scroll_to_cell = function (index, time) {
        return this.scroll_cell_percent(index, 0, time);
    };

    /**
     * Scroll the middle of the page to a given cell.
     *
     * @param {integer}  index - An index of the cell to view
     * @param {integer}  percent - 0-100, the location on the screen to scroll.
     *                   0 is the top, 100 is the bottom.
     * @param {integer}  time - Animation time in milliseconds
     * @return {integer} Pixel offset from the top of the container
     */
    Notebook.prototype.scroll_cell_percent = function (index, percent, time) {
        var cells = this.get_cells();
        time = time || 0;
        percent = percent || 0;
        index = Math.min(cells.length-1,index);
        index = Math.max(0             ,index);
        var sme = this.scroll_manager.element;
        var h = sme.height();
        var st = sme.scrollTop();
        var t = sme.offset().top;
        var ct = cells[index].element.offset().top;
        var scroll_value =  st + ct - (t + .01 * percent * h);
        this.scroll_manager.element.animate({scrollTop:scroll_value}, time);
        return scroll_value;
    };

    /**
     * Scroll to the bottom of the page.
     */
    Notebook.prototype.scroll_to_bottom = function () {
        this.scroll_manager.element.animate({scrollTop:this.element.get(0).scrollHeight}, 0);
    };

    /**
     * Scroll to the top of the page.
     */
    Notebook.prototype.scroll_to_top = function () {
        this.scroll_manager.element.animate({scrollTop:0}, 0);
    };

    // Edit Notebook metadata

    /**
     * Display a dialog that allows the user to edit the Notebook's metadata.
     */
    Notebook.prototype.edit_metadata = function () {
        var that = this;
        dialog.edit_metadata({
            md: this.metadata, 
            callback: function (md) {
                that.metadata = md;
            },
            name: 'Notebook',
            notebook: this,
            keyboard_manager: this.keyboard_manager});
    };

    // Cell indexing, retrieval, etc.

    /**
     * Get all cell elements in the notebook.
     * 
     * @return {jQuery} A selector of all cell elements
     */
    Notebook.prototype.get_cell_elements = function () {
        return this.container.find(".cell").not('.cell .cell');
    };

    /**
     * Get a particular cell element.
     * 
     * @param {integer} index An index of a cell to select
     * @return {jQuery} A selector of the given cell.
     */
    Notebook.prototype.get_cell_element = function (index) {
        var result = null;
        var e = this.get_cell_elements().eq(index);
        if (e.length !== 0) {
            result = e;
        }
        return result;
    };

    /**
     * Try to get a particular cell by msg_id.
     * 
     * @param {string} msg_id A message UUID
     * @return {Cell} Cell or null if no cell was found.
     */
    Notebook.prototype.get_msg_cell = function (msg_id) {
        return codecell.CodeCell.msg_cells[msg_id] || null;
    };

    /**
     * Count the cells in this notebook.
     * 
     * @return {integer} The number of cells in this notebook
     */
    Notebook.prototype.ncells = function () {
        return this.get_cell_elements().length;
    };

    /**
     * Get all Cell objects in this notebook.
     * 
     * @return {Array} This notebook's Cell objects
     */
    Notebook.prototype.get_cells = function () {
        // TODO: we are often calling cells as cells()[i], which we should optimize
        // to cells(i) or a new method.
        return this.get_cell_elements().toArray().map(function (e) {
            return $(e).data("cell");
        });
    };

    /**
     * Get a Cell objects from this notebook.
     * 
     * @param {integer} index - An index of a cell to retrieve
     * @return {Cell} Cell or null if no cell was found.
     */
    Notebook.prototype.get_cell = function (index) {
        var result = null;
        var ce = this.get_cell_element(index);
        if (ce !== null) {
            result = ce.data('cell');
        }
        return result;
    };

    /**
     * Get the cell below a given cell.
     * 
     * @param {Cell} cell
     * @return {Cell} the next cell or null if no cell was found.
     */
    Notebook.prototype.get_next_cell = function (cell) {
        var result = null;
        var index = this.find_cell_index(cell);
        if (this.is_valid_cell_index(index+1)) {
            result = this.get_cell(index+1);
        }
        return result;
    };

    /**
     * Get the cell above a given cell.
     * 
     * @param {Cell} cell
     * @return {Cell} The previous cell or null if no cell was found.
     */
    Notebook.prototype.get_prev_cell = function (cell) {
        var result = null;
        var index = this.find_cell_index(cell);
        if (index !== null && index > 0) {
            result = this.get_cell(index-1);
        }
        return result;
    };

    /**
     * Get the numeric index of a given cell.
     * 
     * @param {Cell} cell
     * @return {integer} The cell's numeric index or null if no cell was found.
     */
    Notebook.prototype.find_cell_index = function (cell) {
        var result = null;
        this.get_cell_elements().filter(function (index) {
            if ($(this).data("cell") === cell) {
                result = index;
            }
        });
        return result;
    };

    /**
     * Return given index if defined, or the selected index if not.
     * 
     * @param {integer} [index] - A cell's index
     * @return {integer} cell index
     */
    Notebook.prototype.index_or_selected = function (index) {
        var i;
        if (index === undefined || index === null) {
            i = this.get_selected_index();
            if (i === null) {
                i = 0;
            }
        } else {
            i = index;
        }
        return i;
    };

    /**
     * Get the currently selected cell.
     * 
     * @return {Cell} The selected cell
     */
    Notebook.prototype.get_selected_cell = function () {
        var index = this.get_selected_index();
        return this.get_cell(index);
    };

    /**
     * Check whether a cell index is valid.
     * 
     * @param {integer} index - A cell index
     * @return True if the index is valid, false otherwise
     */
    Notebook.prototype.is_valid_cell_index = function (index) {
        if (index !== null && index >= 0 && index < this.ncells()) {
            return true;
        } else {
            return false;
        }
    };

    /**
     * Get the index of the currently selected cell.
     *
     * @return {integer} The selected cell's numeric index
     */
    Notebook.prototype.get_selected_index = function () {
        var result = null;
        this.get_cell_elements().filter(function (index) {
            if ($(this).data("cell").selected === true) {
                result = index;
            }
        });
        return result;
    };

    /**
     * Get the index of the anchor cell for range selection
     *
     * @return {integer} The anchor cell's numeric index
     */
    Notebook.prototype.get_selection_anchor = function() {
        var result = null;
        this.get_cell_elements().filter(function (index) {
            if ($(this).data("cell").selection_anchor === true) {
                result = index;
            }
        });
        return result;
    };

    /**
     * Get an array of the cells in the currently selected range
     *
     * @return {Array} The selected cells
     */
    Notebook.prototype.get_selected_cells = function () {
        return this.get_cells().filter(function(cell) {
            return cell.in_selection;
        });
    };

    /**
     * Get the indices of the currently selected range of cells.
     *
     * @return {Array} The selected cells' numeric indices
     */
    Notebook.prototype.get_selected_indices = function () {
        var result = [];
        this.get_cell_elements().filter(function (index) {
            if ($(this).data("cell").in_selection === true) {
                result.push(index);
            }
        });
        return result;
    };

    // Cell selection.

    /**
     * Programmatically select a cell.
     * 
     * @param {integer} index - A cell's index
     * @return {Notebook} This notebook
     */
    Notebook.prototype.select = function (index) {
        if (this.is_valid_cell_index(index)) {
            var sindex = this.get_selected_index();
            if (sindex !== null && index !== sindex) {
                // If we are about to select a different cell, make sure we are
                // first in command mode.
                if (this.mode !== 'command') {
                    this.command_mode();
                }
            }
            var current_selection = this.get_selected_cells();
            for (var i=0; i<current_selection.length; i++) {
                current_selection[i].unselect()
            }

            var cell = this._select(index);
            cell.selection_anchor = true
        }
        return this;
    };

    Notebook.prototype._select = function(index) {
        var cell = this.get_cell(index);
        cell.select();
        this.events.trigger('selected_cell_type_changed.Notebook',
            {'cell_type':cell.cell_type}
        );
        return cell;
    };

    /**
     * Programmatically select the next cell.
     *
     * @return {Notebook} This notebook
     */
    Notebook.prototype.select_next = function () {
        var index = this.get_selected_index();
        this.select(index+1);
        return this;
    };

    /**
     * Programmatically select the previous cell.
     *
     * @return {Notebook} This notebook
     */
    Notebook.prototype.select_prev = function () {
        var index = this.get_selected_index();
        this.select(index-1);
        return this;
    };

    /**
     * Extend the selected range
     *
     * @param {string} direction - 'up' or 'down
     */
    Notebook.prototype.extend_selection = function(direction) {
        var anchor_ix = this.get_selection_anchor();
        var cursor_ix = this.get_selected_index();
        var range_direction = (cursor_ix > anchor_ix) ? 'down' : 'up';
        var contracting = (cursor_ix !== anchor_ix) &&
                            (direction !== range_direction);
        var ix_delta = (direction === 'up') ? -1 : 1;
        var new_ix = cursor_ix + ix_delta;
        if (new_ix < 0 || new_ix >= this.ncells()) {
            return false;
        }
        if (this.mode !== 'command') {
            this.command_mode();
        }
        this.get_cell(cursor_ix).unselect(!contracting);
        this._select(new_ix);
        return true;
    };

    /**
     * Clear selection of multiple cells (except the cell at the cursor)
     */
    Notebook.prototype.reset_selection = function() {
        var current_selection = this.get_selected_cells();
        for (var i=0; i<current_selection.length; i++) {
            if (!current_selection[i].selected) {
                current_selection[i].unselect()
            }
        }
    };


    // Edit/Command mode

    /**
     * Gets the index of the cell that is in edit mode.
     *
     * @return {integer} index
     */
    Notebook.prototype.get_edit_index = function () {
        var result = null;
        this.get_cell_elements().filter(function (index) {
            if ($(this).data("cell").mode === 'edit') {
                result = index;
            }
        });
        return result;
    };

    /**
     * Handle when a a cell blurs and the notebook should enter command mode.
     *
     * @param {Cell} [cell] - Cell to enter command mode on.
     */
    Notebook.prototype.handle_command_mode = function (cell) {
        if (this.mode !== 'command') {
            cell.command_mode();
            this.mode = 'command';
            this.events.trigger('command_mode.Notebook');
            this.keyboard_manager.command_mode();
        }
    };

    /**
     * Make the notebook enter command mode.
     */
    Notebook.prototype.command_mode = function () {
        var cell = this.get_cell(this.get_edit_index());
        if (cell && this.mode !== 'command') {
            // We don't call cell.command_mode, but rather blur the CM editor
            // which will trigger the call to handle_command_mode.
            cell.code_mirror.getInputField().blur();
        }
    };

    /**
     * Handle when a cell fires it's edit_mode event.
     *
     * @param {Cell} [cell] Cell to enter edit mode on.
     */
    Notebook.prototype.handle_edit_mode = function (cell) {
        if (cell && this.mode !== 'edit') {
            cell.edit_mode();
            this.mode = 'edit';
            this.reset_selection();
            this.events.trigger('edit_mode.Notebook');
            this.keyboard_manager.edit_mode();
        }
    };

    /**
     * Make a cell enter edit mode.
     */
    Notebook.prototype.edit_mode = function () {
        var cell = this.get_selected_cell();
        if (cell && this.mode !== 'edit') {
            cell.unrender();
            cell.focus_editor();
        }
    };

    /**
     * Ensure either cell, or codemirror is focused. Is none 
     * is focused, focus the cell.
     */
    Notebook.prototype.ensure_focused = function(){
        var cell = this.get_selected_cell();
        if (cell === null) {return;}  // No cell is selected
        cell.ensure_focused();
    }

    /**
     * Focus the currently selected cell.
     */
    Notebook.prototype.focus_cell = function () {
        var cell = this.get_selected_cell();
        if (cell === null) {return;}  // No cell is selected
        cell.focus_cell();
    };

    // Cell movement

    /**
     * Move given (or selected) cell up and select it.
     * 
     * @param {integer} [index] - cell index
     * @return {Notebook} This notebook
     */
    Notebook.prototype.move_cell_up = function (index) {
        var i = this.index_or_selected(index);
        if (this.is_valid_cell_index(i) && i > 0) {
            var pivot = this.get_cell_element(i-1);
            var tomove = this.get_cell_element(i);
            if (pivot !== null && tomove !== null) {
                tomove.detach();
                pivot.before(tomove);
                this.select(i-1);
                var cell = this.get_selected_cell();
                cell.focus_cell();
            }
            this.set_dirty(true);
        }
        return this;
    };


    /**
     * Move given (or selected) cell down and select it.
     * 
     * @param {integer} [index] - cell index
     * @return {Notebook} This notebook
     */
    Notebook.prototype.move_cell_down = function (index) {
        var i = this.index_or_selected(index);
        if (this.is_valid_cell_index(i) && this.is_valid_cell_index(i+1)) {
            var pivot = this.get_cell_element(i+1);
            var tomove = this.get_cell_element(i);
            if (pivot !== null && tomove !== null) {
                tomove.detach();
                pivot.after(tomove);
                this.select(i+1);
                var cell = this.get_selected_cell();
                cell.focus_cell();
            }
        }
        this.set_dirty();
        return this;
    };


    // Insertion, deletion.

    /**
     * Delete a cell from the notebook without any precautions
     * Needed to reload checkpoints and other things like that.
     * 
     * @param {integer} [index] - cell's numeric index
     * @return {Notebook} This notebook
     */
    Notebook.prototype._unsafe_delete_cell = function (index) {
        var i = this.index_or_selected(index);
        var cell = this.get_cell(i);

        $('#undelete_cell').addClass('disabled');
        if (this.is_valid_cell_index(i)) {
            var old_ncells = this.ncells();
            var ce = this.get_cell_element(i);
            ce.remove();
            this.set_dirty(true);
        }
        return this;
    };


    /**
     * Delete cells from the notebook
     *
     * @param {Array} [indices] - the numeric indices of cells to delete.
     * @return {Notebook} This notebook
     */
    Notebook.prototype.delete_cells = function(indices) {
        if (indices === undefined) {
            indices = this.get_selected_indices();
        }

        this.undelete_backup = [];

        var cursor_ix_before = this.get_selected_index();
        var deleting_before_cursor = 0;
        for (var i=0; i < indices.length; i++) {
            if (!this.get_cell(indices[i]).is_deletable()) {
                // If any cell is marked undeletable, cancel
                return this;
            }

            if (indices[i] < cursor_ix_before) {
                deleting_before_cursor++;
            }
        }

        // If we started deleting cells from the top, the later indices would
        // get offset. We sort them into descending order to avoid that.
        indices.sort(function(a, b) {return b-a;});
        for (i=0; i < indices.length; i++) {
            var cell = this.get_cell(indices[i]);
            this.undelete_backup.push(cell.toJSON());
            this.get_cell_element(indices[i]).remove();
            this.events.trigger('delete.Cell', {'cell': cell, 'index': indices[i]});
        }

        // Flip the backup copy of cells back to first-to-last order
        this.undelete_backup.reverse();

        var new_ncells = this.ncells();
        // Always make sure we have at least one cell.
        if (new_ncells === 0) {
            this.insert_cell_below('code');
            new_ncells = 1;
        }

        this.undelete_below = false;
        var cursor_ix_after = this.get_selected_index();
        if (cursor_ix_after === null) {
            // Selected cell was deleted
            cursor_ix_after = cursor_ix_before - deleting_before_cursor;
            if (cursor_ix_after >= new_ncells) {
                cursor_ix_after = new_ncells - 1;
                this.undelete_below = true;
            }
            this.select(cursor_ix_after);
        }

        // This will put all the deleted cells back in one location, rather than
        // where they came from. It will do until we have proper undo support.
        this.undelete_index = cursor_ix_after;
        $('#undelete_cell').removeClass('disabled');

        this.set_dirty(true);

        return this;
    };

    /**
     * Delete a cell from the notebook.
     * 
     * @param {integer} [index] - cell's numeric index
     * @return {Notebook} This notebook
     */
    Notebook.prototype.delete_cell = function (index) {
        if (index === undefined) {
            return this.delete_cells();
        } else {
            return this.delete_cells([index]);
        }
    };

    /**
     * Restore the most recently deleted cells.
     */
    Notebook.prototype.undelete_cell = function() {
        if (this.undelete_backup !== null && this.undelete_index !== null) {
            var i, cell_data, new_cell;
            if (this.undelete_below) {
                for (i = this.undelete_backup.length-1; i >= 0; i--) {
                    cell_data = this.undelete_backup[i];
                    new_cell = this.insert_cell_below(cell_data.cell_type,
                        this.undelete_index);
                    new_cell.fromJSON(cell_data);
                }
            } else {
                for (i=0; i < this.undelete_backup.length; i++) {
                    cell_data = this.undelete_backup[i];
                    new_cell = this.insert_cell_above(cell_data.cell_type,
                        this.undelete_index);
                    new_cell.fromJSON(cell_data);
                }
            }

            this.set_dirty(true);
            this.undelete_backup = null;
            this.undelete_index = null;
        }
        $('#undelete_cell').addClass('disabled');
    };

    /**
     * Insert a cell so that after insertion the cell is at given index.
     *
     * If cell type is not provided, it will default to the type of the
     * currently active cell.
     *
     * Similar to insert_above, but index parameter is mandatory.
     *
     * Index will be brought back into the accessible range [0,n].
     *
     * @param {string} [type] - in ['code','markdown', 'raw'], defaults to 'code'
     * @param {integer} [index] - a valid index where to insert cell
     * @return {Cell|null} created cell or null
     */
    Notebook.prototype.insert_cell_at_index = function(type, index){

        var ncells = this.ncells();
        index = Math.min(index, ncells);
        index = Math.max(index, 0);
        var cell = null;
        type = type || this.class_config.get_sync('default_cell_type');
        if (type === 'above') {
            if (index > 0) {
                type = this.get_cell(index-1).cell_type;
            } else {
                type = 'code';
            }
        } else if (type === 'below') {
            if (index < ncells) {
                type = this.get_cell(index).cell_type;
            } else {
                type = 'code';
            }
        } else if (type === 'selected') {
            type = this.get_selected_cell().cell_type;
        }

        if (ncells === 0 || this.is_valid_cell_index(index) || index === ncells) {
            var cell_options = {
                events: this.events, 
                config: this.config, 
                keyboard_manager: this.keyboard_manager, 
                notebook: this,
                tooltip: this.tooltip
            };
            switch(type) {
            case 'code':
                cell = new codecell.CodeCell(this.kernel, cell_options);
                cell.set_input_prompt();
                break;
            case 'markdown':
                cell = new textcell.MarkdownCell(cell_options);
                break;
            case 'raw':
                cell = new textcell.RawCell(cell_options);
                break;
            default:
                console.log("Unrecognized cell type: ", type, cellmod);
                cell = new cellmod.UnrecognizedCell(cell_options);
            }

            if(this._insert_element_at_index(cell.element,index)) {
                cell.render();
                this.events.trigger('create.Cell', {'cell': cell, 'index': index});
                cell.refresh();
                // We used to select the cell after we refresh it, but there
                // are now cases were this method is called where select is
                // not appropriate. The selection logic should be handled by the
                // caller of the the top level insert_cell methods.
                this.set_dirty(true);
            }
        }
        return cell;

    };

    /**
     * Insert an element at given cell index.
     *
     * @param {HTMLElement} element - a cell element
     * @param {integer}     [index] - a valid index where to inser cell
     * @returns {boolean}   success
     */
    Notebook.prototype._insert_element_at_index = function(element, index){
        if (element === undefined){
            return false;
        }

        var ncells = this.ncells();

        if (ncells === 0) {
            // special case append if empty
            this.container.append(element);
        } else if ( ncells === index ) {
            // special case append it the end, but not empty
            this.get_cell_element(index-1).after(element);
        } else if (this.is_valid_cell_index(index)) {
            // otherwise always somewhere to append to
            this.get_cell_element(index).before(element);
        } else {
            return false;
        }

        if (this.undelete_index !== null && index <= this.undelete_index) {
            this.undelete_index = this.undelete_index + 1;
            this.set_dirty(true);
        }
        return true;
    };

    /**
     * Insert a cell of given type above given index, or at top
     * of notebook if index smaller than 0.
     *
     * @param {string}     [type] - cell type
     * @param {integer}    [index] - defaults to the currently selected cell
     * @return {Cell|null} handle to created cell or null
     */
    Notebook.prototype.insert_cell_above = function (type, index) {
        index = this.index_or_selected(index);
        return this.insert_cell_at_index(type, index);
    };

    /**
     * Insert a cell of given type below given index, or at bottom
     * of notebook if index greater than number of cells
     *
     * @param {string}     [type] - cell type
     * @param {integer}    [index] - defaults to the currently selected cell
     * @return {Cell|null} handle to created cell or null
     */
    Notebook.prototype.insert_cell_below = function (type, index) {
        index = this.index_or_selected(index);
        return this.insert_cell_at_index(type, index+1);
    };


    /**
     * Insert cell at end of notebook
     *
     * @param {string} type - cell type
     * @return {Cell|null} handle to created cell or null
     */
    Notebook.prototype.insert_cell_at_bottom = function (type){
        var len = this.ncells();
        return this.insert_cell_below(type,len-1);
    };

    /**
     * Turn a cell into a code cell.
     * 
     * @param {integer} [index] - cell index
     */
    Notebook.prototype.to_code = function (index) {
        var i = this.index_or_selected(index);
        if (this.is_valid_cell_index(i)) {
            var source_cell = this.get_cell(i);
            if (!(source_cell instanceof codecell.CodeCell)) {
                var target_cell = this.insert_cell_below('code',i);
                var text = source_cell.get_text();
                if (text === source_cell.placeholder) {
                    text = '';
                }
                //metadata
                target_cell.metadata = source_cell.metadata;

                target_cell.set_text(text);
                // make this value the starting point, so that we can only undo
                // to this state, instead of a blank cell
                target_cell.code_mirror.clearHistory();
                source_cell.element.remove();
                this.select(i);
                var cursor = source_cell.code_mirror.getCursor();
                target_cell.code_mirror.setCursor(cursor);
                this.set_dirty(true);
            }
        }
    };

    /**
     * Turn a cell into a Markdown cell.
     * 
     * @param {integer} [index] - cell index
     */
    Notebook.prototype.to_markdown = function (index) {
        var i = this.index_or_selected(index);
        if (this.is_valid_cell_index(i)) {
            var source_cell = this.get_cell(i);

            if (!(source_cell instanceof textcell.MarkdownCell)) {
                var target_cell = this.insert_cell_below('markdown',i);
                var text = source_cell.get_text();

                if (text === source_cell.placeholder) {
                    text = '';
                }
                // metadata
                target_cell.metadata = source_cell.metadata;
                // We must show the editor before setting its contents
                target_cell.unrender();
                target_cell.set_text(text);
                // make this value the starting point, so that we can only undo
                // to this state, instead of a blank cell
                target_cell.code_mirror.clearHistory();
                source_cell.element.remove();
                this.select(i);
                if ((source_cell instanceof textcell.TextCell) && source_cell.rendered) {
                    target_cell.render();
                }
                var cursor = source_cell.code_mirror.getCursor();
                target_cell.code_mirror.setCursor(cursor);
                this.set_dirty(true);
            }
        }
    };

    /**
     * Turn a cell into a raw text cell.
     * 
     * @param {integer} [index] - cell index
     */
    Notebook.prototype.to_raw = function (index) {
        var i = this.index_or_selected(index);
        if (this.is_valid_cell_index(i)) {
            var target_cell = null;
            var source_cell = this.get_cell(i);

            if (!(source_cell instanceof textcell.RawCell)) {
                target_cell = this.insert_cell_below('raw',i);
                var text = source_cell.get_text();
                if (text === source_cell.placeholder) {
                    text = '';
                }
                //metadata
                target_cell.metadata = source_cell.metadata;
                // We must show the editor before setting its contents
                target_cell.unrender();
                target_cell.set_text(text);
                // make this value the starting point, so that we can only undo
                // to this state, instead of a blank cell
                target_cell.code_mirror.clearHistory();
                source_cell.element.remove();
                this.select(i);
                var cursor = source_cell.code_mirror.getCursor();
                target_cell.code_mirror.setCursor(cursor);
                this.set_dirty(true);
            }
        }
    };

    /**
     * Warn about heading cell support removal.
     */
    Notebook.prototype._warn_heading = function () {
        dialog.modal({
            notebook: this,
            keyboard_manager: this.keyboard_manager,
            title : "Use markdown headings",
            body : $("<p/>").text(
                'Jupyter no longer uses special heading cells. ' + 
                'Instead, write your headings in Markdown cells using # characters:'
            ).append($('<pre/>').text(
                '## This is a level 2 heading'
            )),
            buttons : {
                "OK" : {}
            }
        });
    };

    /**
     * Turn a cell into a heading containing markdown cell.
     * 
     * @param {integer} [index] - cell index
     * @param {integer} [level] - heading level (e.g., 1 for h1)
     */
    Notebook.prototype.to_heading = function (index, level) {
        this.to_markdown(index);
        level = level || 1;
        var i = this.index_or_selected(index);
        if (this.is_valid_cell_index(i)) {
            var cell = this.get_cell(i);
            cell.set_heading_level(level);
            this.set_dirty(true);
        }
    };


    // Cut/Copy/Paste

    /**
     * Enable the UI elements for pasting cells.
     */
    Notebook.prototype.enable_paste = function () {
        var that = this;
        if (!this.paste_enabled) {
            $('#paste_cell_replace').removeClass('disabled')
                .on('click', function () {that.paste_cell_replace();});
            $('#paste_cell_above').removeClass('disabled')
                .on('click', function () {that.paste_cell_above();});
            $('#paste_cell_below').removeClass('disabled')
                .on('click', function () {that.paste_cell_below();});
            this.paste_enabled = true;
        }
    };

    /**
     * Disable the UI elements for pasting cells.
     */
    Notebook.prototype.disable_paste = function () {
        if (this.paste_enabled) {
            $('#paste_cell_replace').addClass('disabled').off('click');
            $('#paste_cell_above').addClass('disabled').off('click');
            $('#paste_cell_below').addClass('disabled').off('click');
            this.paste_enabled = false;
        }
    };

    /**
     * Cut a cell.
     */
    Notebook.prototype.cut_cell = function () {
        this.copy_cell();
        this.delete_cell();
    };

    /**
     * Copy cells.
     */
    Notebook.prototype.copy_cell = function () {
        var cells = this.get_selected_cells();
        this.clipboard = [];
        var cell_json;
        for (var i=0; i < cells.length; i++) {
            cell_json = cells[i].toJSON();
            if (cell_json.metadata.deletable !== undefined) {
                delete cell_json.metadata.deletable;
            }
            this.clipboard.push(cell_json);
        }
        this.enable_paste();
    };

    /**
     * Replace the selected cell with the cells in the clipboard.
     */
    Notebook.prototype.paste_cell_replace = function () {
        if (this.clipboard !== null && this.paste_enabled) {
            var first_inserted = null;
            for (var i=0; i < this.clipboard.length; i++) {
                var cell_data = this.clipboard;
                var new_cell = this.insert_cell_above(cell_data.cell_type);
                new_cell.fromJSON(cell_data);
                if (first_inserted === null) {
                    first_inserted = new_cell;
                }
            }
            var old_selected = this.get_selected_index();
            this.select(this.find_cell_index(first_inserted));
            this.delete_cell(old_selected);
        }
    };

    /**
     * Paste cells from the clipboard above the selected cell.
     */
    Notebook.prototype.paste_cell_above = function () {
        if (this.clipboard !== null && this.paste_enabled) {
            var first_inserted = null;
            for (var i=0; i < this.clipboard.length; i++) {
                var cell_data = this.clipboard[i];
                var new_cell = this.insert_cell_above(cell_data.cell_type);
                new_cell.fromJSON(cell_data);
                if (first_inserted === null) {
                    first_inserted = new_cell;
                }

            }
            first_inserted.focus_cell();
        }
    };

    /**
     * Paste cells from the clipboard below the selected cell.
     */
    Notebook.prototype.paste_cell_below = function () {
        if (this.clipboard !== null && this.paste_enabled) {
            var first_inserted = null;
            for (var i = this.clipboard.length-1; i >= 0; i--) {
                var cell_data = this.clipboard[i];
                var new_cell = this.insert_cell_below(cell_data.cell_type);
                new_cell.fromJSON(cell_data);
                if (first_inserted === null) {
                    first_inserted = new_cell;
                }
            }
            first_inserted.focus_cell();
        }
    };

    // Split/merge

    /**
     * Split the selected cell into two cells.
     */
    Notebook.prototype.split_cell = function () {
        var cell = this.get_selected_cell();
        if (cell.is_splittable()) {
            var texta = cell.get_pre_cursor();
            var textb = cell.get_post_cursor();
            cell.set_text(textb);
            var new_cell = this.insert_cell_above(cell.cell_type);
            // Unrender the new cell so we can call set_text.
            new_cell.unrender();
            new_cell.set_text(texta);
        }
    };

    /**
     * Merge a series of cells into one
     *
     * @param {Array} indices - the numeric indices of the cells to be merged
     * @param {bool} into_last - merge into the last cell instead of the first
     */
    Notebook.prototype.merge_cells = function(indices, into_last) {
        if (indices.length <= 1) {
            return;
        }
        for (var i=0; i < indices.length; i++) {
            if (!this.get_cell(indices[i]).is_mergeable()) {
                return;
            }
        }
        var target = this.get_cell(into_last ? indices.pop() : indices.shift());

        // Get all the cells' contents
        var contents = [];
        for (i=0; i < indices.length; i++) {
            contents.push(this.get_cell(indices[i]).get_text());
        }
        if (into_last) {
            contents.push(target.get_text())
        } else {
            contents.unshift(target.get_text())
        }

        // Update the contents of the target cell
        if (target instanceof codecell.CodeCell) {
            target.set_text(contents.join('\n\n'))
        } else {
            var was_rendered = target.rendered;
            target.unrender(); // Must unrender before we set_text.
            target.set_text(contents.join('\n\n'));
            if (was_rendered) {
                // The rendered state of the final cell should match
                // that of the original selected cell;
                target.render();
            }
        }

        // Delete the other cells
        this.delete_cells(indices);

        this.select(this.find_cell_index(target));
    };

    /**
     * Merge the selected range of cells
     */
    Notebook.prototype.merge_selected_cells = function() {
        this.merge_cells(this.get_selected_indices());
    };

    /**
     * Merge the selected cell into the cell above it.
     */
    Notebook.prototype.merge_cell_above = function () {
        var index = this.get_selected_index();
        this.merge_cells([index-1, index], true)
    };

    /**
     * Merge the selected cell into the cell below it.
     */
    Notebook.prototype.merge_cell_below = function () {
        var index = this.get_selected_index();
        this.merge_cells([index, index+1], false)
    };


    // Cell collapsing and output clearing

    /**
     * Hide a cell's output.
     * 
     * @param {integer} index - cell index
     */
    Notebook.prototype.collapse_output = function (index) {
        var i = this.index_or_selected(index);
        var cell = this.get_cell(i);
        if (cell !== null && (cell instanceof codecell.CodeCell)) {
            cell.collapse_output();
            this.set_dirty(true);
        }
    };

    /**
     * Hide each code cell's output area.
     */
    Notebook.prototype.collapse_all_output = function () {
        this.get_cells().map(function (cell, i) {
            if (cell instanceof codecell.CodeCell) {
                cell.collapse_output();
            }
        });
        // this should not be set if the `collapse` key is removed from nbformat
        this.set_dirty(true);
    };

    /**
     * Show a cell's output.
     * 
     * @param {integer} index - cell index
     */
    Notebook.prototype.expand_output = function (index) {
        var i = this.index_or_selected(index);
        var cell = this.get_cell(i);
        if (cell !== null && (cell instanceof codecell.CodeCell)) {
            cell.expand_output();
            this.set_dirty(true);
        }
    };

    /**
     * Expand each code cell's output area, and remove scrollbars.
     */
    Notebook.prototype.expand_all_output = function () {
        this.get_cells().map(function (cell, i) {
            if (cell instanceof codecell.CodeCell) {
                cell.expand_output();
            }
        });
        // this should not be set if the `collapse` key is removed from nbformat
        this.set_dirty(true);
    };

    /**
     * Clear the selected CodeCell's output area.
     * 
     * @param {integer} index - cell index
     */
    Notebook.prototype.clear_output = function (index) {
        var i = this.index_or_selected(index);
        var cell = this.get_cell(i);
        if (cell !== null && (cell instanceof codecell.CodeCell)) {
            cell.clear_output();
            this.set_dirty(true);
        }
    };

    /**
     * Clear each code cell's output area.
     */
    Notebook.prototype.clear_all_output = function () {
        this.get_cells().map(function (cell, i) {
            if (cell instanceof codecell.CodeCell) {
                cell.clear_output();
            }
        });
        this.set_dirty(true);
    };

    /**
     * Scroll the selected CodeCell's output area.
     * 
     * @param {integer} index - cell index
     */
    Notebook.prototype.scroll_output = function (index) {
        var i = this.index_or_selected(index);
        var cell = this.get_cell(i);
        if (cell !== null && (cell instanceof codecell.CodeCell)) {
            cell.scroll_output();
            this.set_dirty(true);
        }
    };

    /**
     * Expand each code cell's output area and add a scrollbar for long output.
     */
    Notebook.prototype.scroll_all_output = function () {
        this.get_cells().map(function (cell, i) {
            if (cell instanceof codecell.CodeCell) {
                cell.scroll_output();
            }
        });
        // this should not be set if the `collapse` key is removed from nbformat
        this.set_dirty(true);
    };

    /** 
     * Toggle whether a cell's output is collapsed or expanded.
     * 
     * @param {integer} index - cell index
     */
    Notebook.prototype.toggle_output = function (index) {
        var i = this.index_or_selected(index);
        var cell = this.get_cell(i);
        if (cell !== null && (cell instanceof codecell.CodeCell)) {
            cell.toggle_output();
            this.set_dirty(true);
        }
    };

    /**
     * Toggle the output of all cells.
     */
    Notebook.prototype.toggle_all_output = function () {
        this.get_cells().map(function (cell, i) {
            if (cell instanceof codecell.CodeCell) {
                cell.toggle_output();
            }
        });
        // this should not be set if the `collapse` key is removed from nbformat
        this.set_dirty(true);
    };

    /**
     * Toggle a scrollbar for long cell outputs.
     * 
     * @param {integer} index - cell index
     */
    Notebook.prototype.toggle_output_scroll = function (index) {
        var i = this.index_or_selected(index);
        var cell = this.get_cell(i);
        if (cell !== null && (cell instanceof codecell.CodeCell)) {
            cell.toggle_output_scroll();
            this.set_dirty(true);
        }
    };

    /**
     * Toggle the scrolling of long output on all cells.
     */
    Notebook.prototype.toggle_all_output_scroll = function () {
        this.get_cells().map(function (cell, i) {
            if (cell instanceof codecell.CodeCell) {
                cell.toggle_output_scroll();
            }
        });
        // this should not be set if the `collapse` key is removed from nbformat
        this.set_dirty(true);
    };

    // Other cell functions: line numbers, ...

    /**
     * Toggle line numbers in the selected cell's input area.
     */
    Notebook.prototype.cell_toggle_line_numbers = function() {
        this.get_selected_cell().toggle_line_numbers();
    };


    //dispatch codemirror mode to all cells.
    Notebook.prototype._dispatch_mode = function(spec, newmode){
        this.codemirror_mode = newmode;
        codecell.CodeCell.options_default.cm_config.mode = newmode;
        this.get_cells().map(function(cell, i) {
            if (cell.cell_type === 'code'){
                cell.code_mirror.setOption('mode', spec);
                // This is currently redundant, because cm_config ends up as
                // codemirror's own .options object, but I don't want to
                // rely on that.
                cell._options.cm_config.mode = spec;
            }
        });

    };

    // roughly try to check mode equality
    var _mode_equal = function(mode1, mode2){
        return ((mode1||{}).name||mode1)===((mode2||{}).name||mode2);
    };

    /**
     * Set the codemirror mode for all code cells, including the default for
     * new code cells.
     * Set the mode to 'null' (no highlighting) if it can't be found.
     */
    Notebook.prototype.set_codemirror_mode = function(newmode){
        // if mode is the same don't reset,
        // to avoid n-time re-highlighting.
        if (_mode_equal(newmode, this.codemirror_mode)) {
            return;
        }
        
        var that = this;
        utils.requireCodeMirrorMode(newmode, function (spec) {
            that._dispatch_mode(spec, newmode);
        }, function(){
            // on error don't dispatch the new mode as re-setting it later will not work.
            // don't either set to null mode if it has been changed in the meantime
            if( _mode_equal(newmode, this.codemirror_mode) ){
                that._dispatch_mode('null','null');
            }
        });
    };

    // Session related things

    /**
     * Start a new session and set it on each code cell.
     */
    Notebook.prototype.start_session = function (kernel_name) {
        if (this._session_starting) {
            throw new session.SessionAlreadyStarting();
        }
        this._session_starting = true;

        var options = {
            base_url: this.base_url,
            ws_url: this.ws_url,
            notebook_path: this.notebook_path,
            notebook_name: this.notebook_name,
            kernel_name: kernel_name,
            notebook: this
        };

        var success = $.proxy(this._session_started, this);
        var failure = $.proxy(this._session_start_failed, this);

        if (this.session !== null) {
            this.session.restart(options, success, failure);
        } else {
            this.session = new session.Session(options);
            this.session.start(success, failure);
        }
    };


    /**
     * Once a session is started, link the code cells to the kernel and pass the 
     * comm manager to the widget manager.
     */
    Notebook.prototype._session_started = function (){
        this._session_starting = false;
        this.kernel = this.session.kernel;
        var ncells = this.ncells();
        for (var i=0; i<ncells; i++) {
            var cell = this.get_cell(i);
            if (cell instanceof codecell.CodeCell) {
                cell.set_kernel(this.session.kernel);
            }
        }
    };

    /**
     * Called when the session fails to start.
     */
    Notebook.prototype._session_start_failed = function(jqxhr, status, error){
        this._session_starting = false;
        utils.log_ajax_error(jqxhr, status, error);
    };

    /**
     * Prompt the user to restart the Jupyter kernel.
     */
    Notebook.prototype.restart_kernel = function () {
        var that = this;
        dialog.modal({
            notebook: this,
            keyboard_manager: this.keyboard_manager,
            title : "Restart kernel or continue running?",
            body : $("<p/>").text(
                'Do you want to restart the current kernel?  You will lose all variables defined in it.'
            ),
            buttons : {
                "Continue running" : {},
                "Clear all outputs & restart" : {
                    "class" : "btn-danger",
                    "click" : function(){
                        that.clear_all_output();
                        that.kernel.restart();
                    },
                },
                "Restart" : {
                    "class" : "btn-warning",
                    "click" : function() {
                        that.kernel.restart();
                    }
                },
            }
        });
    };

    /**
     * Execute or render cell outputs and go into command mode.
     */
    Notebook.prototype.execute_cell = function () {
        // mode = shift, ctrl, alt
        var cell = this.get_selected_cell();
        
        cell.execute();
        this.command_mode();
        this.set_dirty(true);
    };

    /**
     * Execute or render cell outputs and insert a new cell below.
     */
    Notebook.prototype.execute_cell_and_insert_below = function () {
        var cell = this.get_selected_cell();
        var cell_index = this.find_cell_index(cell);
        
        cell.execute();

        // If we are at the end always insert a new cell and return
        if (cell_index === (this.ncells()-1)) {
            this.command_mode();
            this.insert_cell_below();
            this.select(cell_index+1);
            this.edit_mode();
            this.scroll_to_bottom();
            this.set_dirty(true);
            return;
        }

        this.command_mode();
        this.insert_cell_below();
        this.select(cell_index+1);
        this.edit_mode();
        this.set_dirty(true);
    };

    /**
     * Execute or render cell outputs and select the next cell.
     */
    Notebook.prototype.execute_cell_and_select_below = function () {

        var cell = this.get_selected_cell();
        var cell_index = this.find_cell_index(cell);
        
        cell.execute();

        // If we are at the end always insert a new cell and return
        if (cell_index === (this.ncells()-1)) {
            this.command_mode();
            this.insert_cell_below();
            this.select(cell_index+1);
            this.edit_mode();
            this.scroll_to_bottom();
            this.set_dirty(true);
            return;
        }

        this.command_mode();
        this.select(cell_index+1);
        this.focus_cell();
        this.set_dirty(true);
    };

    /**
     * Execute all cells below the selected cell.
     */
    Notebook.prototype.execute_cells_below = function () {
        this.execute_cell_range(this.get_selected_index(), this.ncells());
        this.scroll_to_bottom();
    };

    /**
     * Execute all cells above the selected cell.
     */
    Notebook.prototype.execute_cells_above = function () {
        this.execute_cell_range(0, this.get_selected_index());
    };

    /**
     * Execute all cells.
     */
    Notebook.prototype.execute_all_cells = function () {
        this.execute_cell_range(0, this.ncells());
        this.scroll_to_bottom();
    };

    /**
     * Execute a contiguous range of cells.
     * 
     * @param {integer} start - index of the first cell to execute (inclusive)
     * @param {integer} end - index of the last cell to execute (exclusive)
     */
    Notebook.prototype.execute_cell_range = function (start, end) {
        this.command_mode();
        for (var i=start; i<end; i++) {
            this.select(i);
            this.execute_cell();
        }
    };

    // Persistance and loading

    /**
     * Getter method for this notebook's name.
     * 
     * @return {string} This notebook's name (excluding file extension)
     */
    Notebook.prototype.get_notebook_name = function () {
        var nbname = utils.splitext(this.notebook_name)[0];
        return nbname;
    };

    /**
     * Setter method for this notebook's name.
     *
     * @param {string} name
     */
    Notebook.prototype.set_notebook_name = function (name) {
        var parent = utils.url_path_split(this.notebook_path)[0];
        this.notebook_name = name;
        this.notebook_path = utils.url_path_join(parent, name);
    };

    /**
     * Check that a notebook's name is valid.
     * 
     * @param {string} nbname - A name for this notebook
     * @return {boolean} True if the name is valid, false if invalid
     */
    Notebook.prototype.test_notebook_name = function (nbname) {
        nbname = nbname || '';
        if (nbname.length>0 && !this.notebook_name_blacklist_re.test(nbname)) {
            return true;
        } else {
            return false;
        }
    };

    /**
     * Load a notebook from JSON (.ipynb).
     * 
     * @param {object} data - JSON representation of a notebook
     */
    Notebook.prototype.fromJSON = function (data) {

        var content = data.content;
        var ncells = this.ncells();
        var i;
        for (i=0; i<ncells; i++) {
            // Always delete cell 0 as they get renumbered as they are deleted.
            this._unsafe_delete_cell(0);
        }
        // Save the metadata and name.
        this.metadata = content.metadata;
        this.notebook_name = data.name;
        this.notebook_path = data.path;
        var trusted = true;
        
        // Set the codemirror mode from language_info metadata
        if (this.metadata.language_info !== undefined) {
            var langinfo = this.metadata.language_info;
            // Mode 'null' should be plain, unhighlighted text.
            var cm_mode = langinfo.codemirror_mode || langinfo.name || 'null';
            this.set_codemirror_mode(cm_mode);
        }
        
        var new_cells = content.cells;
        ncells = new_cells.length;
        var cell_data = null;
        var new_cell = null;
        for (i=0; i<ncells; i++) {
            cell_data = new_cells[i];
            new_cell = this.insert_cell_at_index(cell_data.cell_type, i);
            new_cell.fromJSON(cell_data);
            if (new_cell.cell_type === 'code' && !new_cell.output_area.trusted) {
                trusted = false;
            }
        }
        if (trusted !== this.trusted) {
            this.trusted = trusted;
            this.events.trigger("trust_changed.Notebook", trusted);
        }
    };

    /**
     * Dump this notebook into a JSON-friendly object.
     * 
     * @return {object} A JSON-friendly representation of this notebook.
     */
    Notebook.prototype.toJSON = function () {
        // remove the conversion indicator, which only belongs in-memory
        delete this.metadata.orig_nbformat;
        delete this.metadata.orig_nbformat_minor;

        var cells = this.get_cells();
        var ncells = cells.length;
        var cell_array = new Array(ncells);
        var trusted = true;
        for (var i=0; i<ncells; i++) {
            var cell = cells[i];
            if (cell.cell_type === 'code' && !cell.output_area.trusted) {
                trusted = false;
            }
            cell_array[i] = cell.toJSON();
        }
        var data = {
            cells: cell_array,
            metadata: this.metadata,
            nbformat: this.nbformat,
            nbformat_minor: this.nbformat_minor
        };
        if (trusted !== this.trusted) {
            this.trusted = trusted;
            this.events.trigger("trust_changed.Notebook", trusted);
        }
        return data;
    };

    /**
     * Start an autosave timer which periodically saves the notebook.
     * 
     * @param {integer} interval - the autosave interval in milliseconds
     */
    Notebook.prototype.set_autosave_interval = function (interval) {
        var that = this;
        // clear previous interval, so we don't get simultaneous timers
        if (this.autosave_timer) {
            clearInterval(this.autosave_timer);
        }
        if (!this.writable) {
            // disable autosave if not writable
            interval = 0;
        }
        
        this.autosave_interval = this.minimum_autosave_interval = interval;
        if (interval) {
            this.autosave_timer = setInterval(function() {
                if (that.dirty) {
                    that.save_notebook();
                }
            }, interval);
            this.events.trigger("autosave_enabled.Notebook", interval);
        } else {
            this.autosave_timer = null;
            this.events.trigger("autosave_disabled.Notebook");
        }
    };

    /**
     * Save this notebook on the server. This becomes a notebook instance's
     * .save_notebook method *after* the entire notebook has been loaded.
     */
    Notebook.prototype.save_notebook = function (check_last_modified) {
        if (check_last_modified === undefined) {
            check_last_modified = true;
        }
        if (!this._fully_loaded) {
            this.events.trigger('notebook_save_failed.Notebook',
                new Error("Load failed, save is disabled")
            );
            return;
        } else if (!this.writable) {
            this.events.trigger('notebook_save_failed.Notebook',
                new Error("Notebook is read-only")
            );
            return;
        }

        // Trigger an event before save, which allows listeners to modify
        // the notebook as needed.
        this.events.trigger('before_save.Notebook');

        // Create a JSON model to be sent to the server.
        var model = {
            type : "notebook",
            content : this.toJSON()
        };
        // time the ajax call for autosave tuning purposes.
        var start =  new Date().getTime();

        var that = this;
        var _save = function () {
            return that.contents.save(that.notebook_path, model).then(
                $.proxy(that.save_notebook_success, that, start),
                function (error) {
                    that.events.trigger('notebook_save_failed.Notebook', error);
                }
            );
        };

        if (check_last_modified) {
            return this.contents.get(this.notebook_path, {content: false}).then(
                function (data) {
                    var last_modified = new Date(data.last_modified);
                    if (last_modified > that.last_modified) {
                        dialog.modal({
                            notebook: that,
                            keyboard_manager: that.keyboard_manager,
                            title: "Notebook changed",
                            body: "The notebook file has changed on disk since the last time we opened or saved it. "+
                                  "Do you want to overwrite the file on disk with the version open here, or load "+
                                  "the version on disk (reload the page) ?",
                            buttons: {
                                Reload: {
                                    class: 'btn-warning',
                                    click: function() {
                                        window.location.reload();
                                    }
                                },
                                Cancel: {},
                                Overwrite: {
                                    class: 'btn-danger',
                                    click: function () {
                                        _save();
                                    }
                                },
                            }
                        });
                    } else {
                        return _save();
                    }
                }, function (error) {
                    // maybe it has been deleted or renamed? Go ahead and save.
                    return _save();
                }
            );
        } else {
            return _save();
        }
    };

    /**
     * Success callback for saving a notebook.
     * 
     * @param {integer} start - Time when the save request start
     * @param {object}  data - JSON representation of a notebook
     */
    Notebook.prototype.save_notebook_success = function (start, data) {
        this.set_dirty(false);
        this.last_modified = new Date(data.last_modified);
        if (data.message) {
            // save succeeded, but validation failed.
            var body = $("<div>");
            var title = "Notebook validation failed";

            body.append($("<p>").text(
                "The save operation succeeded," +
                " but the notebook does not appear to be valid." +
                " The validation error was:"
            )).append($("<div>").addClass("validation-error").append(
                $("<pre>").text(data.message)
            ));
            dialog.modal({
                notebook: this,
                keyboard_manager: this.keyboard_manager,
                title: title,
                body: body,
                buttons : {
                    OK : {
                        "class" : "btn-primary"
                    }
                }
            });
        }
        this.events.trigger('notebook_saved.Notebook');
        this._update_autosave_interval(start);
        if (this._checkpoint_after_save) {
            this.create_checkpoint();
            this._checkpoint_after_save = false;
        }
    };

    /**
     * Update the autosave interval based on the duration of the last save.
     * 
     * @param {integer} timestamp - when the save request started
     */
    Notebook.prototype._update_autosave_interval = function (start) {
        var duration = (new Date().getTime() - start);
        if (this.autosave_interval) {
            // new save interval: higher of 10x save duration or parameter (default 30 seconds)
            var interval = Math.max(10 * duration, this.minimum_autosave_interval);
            // round to 10 seconds, otherwise we will be setting a new interval too often
            interval = 10000 * Math.round(interval / 10000);
            // set new interval, if it's changed
            if (interval !== this.autosave_interval) {
                this.set_autosave_interval(interval);
            }
        }
    };

    /**
     * Explicitly trust the output of this notebook.
     */
    Notebook.prototype.trust_notebook = function () {
        var body = $("<div>").append($("<p>")
            .text("A trusted Jupyter notebook may execute hidden malicious code ")
            .append($("<strong>")
                .append(
                    $("<em>").text("when you open it")
                )
            ).append(".").append(
                " Selecting trust will immediately reload this notebook in a trusted state."
            ).append(
                " For more information, see the "
            ).append($("<a>").attr("href", "http://ipython.org/ipython-doc/2/notebook/security.html")
                .text("Jupyter security documentation")
            ).append(".")
        );

        var nb = this;
        dialog.modal({
            notebook: this,
            keyboard_manager: this.keyboard_manager,
            title: "Trust this notebook?",
            body: body,

            buttons: {
                Cancel : {},
                Trust : {
                    class : "btn-danger",
                    click : function () {
                        var cells = nb.get_cells();
                        for (var i = 0; i < cells.length; i++) {
                            var cell = cells[i];
                            if (cell.cell_type === 'code') {
                                cell.output_area.trusted = true;
                            }
                        }
                        nb.events.on('notebook_saved.Notebook', function () {
                            window.location.reload();
                        });
                        nb.save_notebook();
                    }
                }
            }
        });
    };

    /**
     * Make a copy of the current notebook.
     */
    Notebook.prototype.copy_notebook = function () {
        var that = this;
        var base_url = this.base_url;
        var w = window.open('', IPython._target);
        var parent = utils.url_path_split(this.notebook_path)[0];
        this.contents.copy(this.notebook_path, parent).then(
            function (data) {
                w.location = utils.url_join_encode(
                    base_url, 'notebooks', data.path
                );
            },
            function(error) {
                w.close();
                that.events.trigger('notebook_copy_failed', error);
            }
        );
    };

    /**
     * Ensure a filename has the right extension
     * Returns the filename with the appropriate extension, appending if necessary.
     */
    Notebook.prototype.ensure_extension = function (name) {
        var ext = utils.splitext(this.notebook_path)[1];
        if (ext.length && name.slice(-ext.length) !== ext) {
            name = name + ext;
        }
        return name;
    };

    /**
     * Rename the notebook.
     * @param  {string} new_name
     * @return {Promise} promise that resolves when the notebook is renamed.
     */
    Notebook.prototype.rename = function (new_name) {
        new_name = this.ensure_extension(new_name);

        var that = this;
        var parent = utils.url_path_split(this.notebook_path)[0];
        var new_path = utils.url_path_join(parent, new_name);
        return this.contents.rename(this.notebook_path, new_path).then(
            function (json) {
                that.notebook_name = json.name;
                that.notebook_path = json.path;
                that.last_modified = new Date(json.last_modified);
                that.session.rename_notebook(json.path);
                that.events.trigger('notebook_renamed.Notebook', json);
            }
        );
    };

    /**
     * Delete this notebook
     */
    Notebook.prototype.delete = function () {
        this.contents.delete(this.notebook_path);
    };

    /**
     * Request a notebook's data from the server.
     * 
     * @param {string} notebook_path - A notebook to load
     */
    Notebook.prototype.load_notebook = function (notebook_path) {
        this.notebook_path = notebook_path;
        this.notebook_name = utils.url_path_split(this.notebook_path)[1];
        this.events.trigger('notebook_loading.Notebook');
        this.contents.get(notebook_path, {type: 'notebook'}).then(
            $.proxy(this.load_notebook_success, this),
            $.proxy(this.load_notebook_error, this)
        );
    };

    /**
     * Success callback for loading a notebook from the server.
     * 
     * Load notebook data from the JSON response.
     * 
     * @param {object} data JSON representation of a notebook
     */
    Notebook.prototype.load_notebook_success = function (data) {
        var failed, msg;
        try {
            this.fromJSON(data);
        } catch (e) {
            failed = e;
            console.log("Notebook failed to load from JSON:", e);
        }
        if (failed || data.message) {
            // *either* fromJSON failed or validation failed
            var body = $("<div>");
            var title;
            if (failed) {
                title = "Notebook failed to load";
                body.append($("<p>").text(
                    "The error was: "
                )).append($("<div>").addClass("js-error").text(
                    failed.toString()
                )).append($("<p>").text(
                    "See the error console for details."
                ));
            } else {
                title = "Notebook validation failed";
            }

            if (data.message) {
                if (failed) {
                    msg = "The notebook also failed validation:";
                } else {
                    msg = "An invalid notebook may not function properly." +
                    " The validation error was:";
                }
                body.append($("<p>").text(
                    msg
                )).append($("<div>").addClass("validation-error").append(
                    $("<pre>").text(data.message)
                ));
            }

            dialog.modal({
                notebook: this,
                keyboard_manager: this.keyboard_manager,
                title: title,
                body: body,
                buttons : {
                    OK : {
                        "class" : "btn-primary"
                    }
                }
            });
        }
        if (this.ncells() === 0) {
            this.insert_cell_below('code');
            this.edit_mode(0);
        } else {
            this.select(0);
            this.handle_command_mode(this.get_cell(0));
        }
        this.set_dirty(false);
        this.scroll_to_top();
        this.writable = data.writable || false;
        this.last_modified = new Date(data.last_modified);
        var nbmodel = data.content;
        var orig_nbformat = nbmodel.metadata.orig_nbformat;
        var orig_nbformat_minor = nbmodel.metadata.orig_nbformat_minor;
        if (orig_nbformat !== undefined && nbmodel.nbformat !== orig_nbformat) {
            var src;
            if (nbmodel.nbformat > orig_nbformat) {
                src = " an older notebook format ";
            } else {
                src = " a newer notebook format ";
            }
            
            msg = "This notebook has been converted from" + src +
            "(v"+orig_nbformat+") to the current notebook " +
            "format (v"+nbmodel.nbformat+"). The next time you save this notebook, the " +
            "current notebook format will be used.";
            
            if (nbmodel.nbformat > orig_nbformat) {
                msg += " Older versions of Jupyter may not be able to read the new format.";
            } else {
                msg += " Some features of the original notebook may not be available.";
            }
            msg += " To preserve the original version, close the " +
                "notebook without saving it.";
            dialog.modal({
                notebook: this,
                keyboard_manager: this.keyboard_manager,
                title : "Notebook converted",
                body : msg,
                buttons : {
                    OK : {
                        class : "btn-primary"
                    }
                }
            });
        } else if (this.nbformat_minor < nbmodel.nbformat_minor) {
            this.nbformat_minor = nbmodel.nbformat_minor;
        }

        if (this.session === null) {
            var kernel_name = utils.get_url_param('kernel_name');
            if (kernel_name) {
                this.kernel_selector.set_kernel(kernel_name);
            } else if (this.metadata.kernelspec) {
                this.kernel_selector.set_kernel(this.metadata.kernelspec);
            } else if (this.metadata.language) {
                // compat with IJulia, IHaskell, and other early kernels
                // adopters that where setting a language metadata.
                this.kernel_selector.set_kernel({
                    name: "(No name)",
                    language: this.metadata.language
                  });
                // this should be stored in kspec now, delete it.
                // remove once we do not support notebook v3 anymore.
                delete this.metadata.language;
            } else {
                // setting kernel via set_kernel above triggers start_session,
                // otherwise start a new session with the server's default kernel
                // spec_changed events will fire after kernel is loaded
                this.start_session();
            }
        }
        // load our checkpoint list
        this.list_checkpoints();
        
        // load toolbar state
        if (this.metadata.celltoolbar) {
            celltoolbar.CellToolbar.global_show();
            celltoolbar.CellToolbar.activate_preset(this.metadata.celltoolbar);
        } else {
            celltoolbar.CellToolbar.global_hide();
        }
        
        if (!this.writable) {
            this.set_autosave_interval(0);
            this.events.trigger('notebook_read_only.Notebook');
        }
        
        // now that we're fully loaded, it is safe to restore save functionality
        this._fully_loaded = true;
        this.events.trigger('notebook_loaded.Notebook');
    };

    Notebook.prototype.set_kernelselector = function(k_selector){
        this.kernel_selector = k_selector;
    };

    /**
     * Failure callback for loading a notebook from the server.
     * 
     * @param {Error} error
     */
    Notebook.prototype.load_notebook_error = function (error) {
        this.events.trigger('notebook_load_failed.Notebook', error);
        var msg;
        if (error.name === utils.XHR_ERROR && error.xhr.status === 500) {
            utils.log_ajax_error(error.xhr, error.xhr_status, error.xhr_error);
            msg = "An unknown error occurred while loading this notebook. " +
            "This version can load notebook formats " +
            "v" + this.nbformat + " or earlier. See the server log for details.";
        } else {
            msg = error.message;
            console.warn('Error stack trace while loading notebook was:');
            console.warn(error.stack);
        }
        dialog.modal({
            notebook: this,
            keyboard_manager: this.keyboard_manager,
            title: "Error loading notebook",
            body : msg,
            buttons : {
                "OK": {}
            }
        });
    };

    /*********************  checkpoint-related  ********************/

    /**
     * Save the notebook then immediately create a checkpoint.
     */
    Notebook.prototype.save_checkpoint = function () {
        this._checkpoint_after_save = true;
        this.save_notebook();
    };

    /**
     * Add a checkpoint for this notebook.
     */
    Notebook.prototype.add_checkpoint = function (checkpoint) {
        var found = false;
        for (var i = 0; i < this.checkpoints.length; i++) {
            var existing = this.checkpoints[i];
            if (existing.id === checkpoint.id) {
                found = true;
                this.checkpoints[i] = checkpoint;
                break;
            }
        }
        if (!found) {
            this.checkpoints.push(checkpoint);
        }
        this.last_checkpoint = this.checkpoints[this.checkpoints.length - 1];
    };

    /**
     * List checkpoints for this notebook.
     */
    Notebook.prototype.list_checkpoints = function () {
        var that = this;
        this.contents.list_checkpoints(this.notebook_path).then(
            $.proxy(this.list_checkpoints_success, this),
            function(error) {
                that.events.trigger('list_checkpoints_failed.Notebook', error);
            }
        );
    };

    /**
     * Success callback for listing checkpoints.
     * 
     * @param {object} data - JSON representation of a checkpoint
     */
    Notebook.prototype.list_checkpoints_success = function (data) {
        this.checkpoints = data;
        if (data.length) {
            this.last_checkpoint = data[data.length - 1];
        } else {
            this.last_checkpoint = null;
        }
        this.events.trigger('checkpoints_listed.Notebook', [data]);
    };

    /**
     * Create a checkpoint of this notebook on the server from the most recent save.
     */
    Notebook.prototype.create_checkpoint = function () {
        var that = this;
        this.contents.create_checkpoint(this.notebook_path).then(
            $.proxy(this.create_checkpoint_success, this),
            function (error) {
                that.events.trigger('checkpoint_failed.Notebook', error);
            }
        );
    };

    /**
     * Success callback for creating a checkpoint.
     * 
     * @param {object} data - JSON representation of a checkpoint
     */
    Notebook.prototype.create_checkpoint_success = function (data) {
        this.add_checkpoint(data);
        this.events.trigger('checkpoint_created.Notebook', data);
    };

    /**
     * Display the restore checkpoint dialog
     * @param  {string} checkpoint ID
     */
    Notebook.prototype.restore_checkpoint_dialog = function (checkpoint) {
        var that = this;
        checkpoint = checkpoint || this.last_checkpoint;
        if ( ! checkpoint ) {
            console.log("restore dialog, but no checkpoint to restore to!");
            return;
        }
        var body = $('<div/>').append(
            $('<p/>').addClass("p-space").text(
                "Are you sure you want to revert the notebook to " +
                "the latest checkpoint?"
            ).append(
                $("<strong/>").text(
                    " This cannot be undone."
                )
            )
        ).append(
            $('<p/>').addClass("p-space").text("The checkpoint was last updated at:")
        ).append(
            $('<p/>').addClass("p-space").text(
                moment(checkpoint.last_modified).format('LLLL') +
                ' ('+moment(checkpoint.last_modified).fromNow()+')'// Long form:  Tuesday, January 27, 2015 12:15 PM
            ).css("text-align", "center")
        );
        
        dialog.modal({
            notebook: this,
            keyboard_manager: this.keyboard_manager,
            title : "Revert notebook to checkpoint",
            body : body,
            buttons : {
                Revert : {
                    class : "btn-danger",
                    click : function () {
                        that.restore_checkpoint(checkpoint.id);
                    }
                },
                Cancel : {}
                }
        });
    };

    /**
     * Restore the notebook to a checkpoint state.
     * 
     * @param {string} checkpoint ID
     */
    Notebook.prototype.restore_checkpoint = function (checkpoint) {
        this.events.trigger('notebook_restoring.Notebook', checkpoint);
        var that = this;
        this.contents.restore_checkpoint(this.notebook_path, checkpoint).then(
            $.proxy(this.restore_checkpoint_success, this),
            function (error) {
                that.events.trigger('checkpoint_restore_failed.Notebook', error);
            }
        );
    };

    /**
     * Success callback for restoring a notebook to a checkpoint.
     */
    Notebook.prototype.restore_checkpoint_success = function () {
        this.events.trigger('checkpoint_restored.Notebook');
        this.load_notebook(this.notebook_path);
    };

    /**
     * Delete a notebook checkpoint.
     * 
     * @param {string} checkpoint ID
     */
    Notebook.prototype.delete_checkpoint = function (checkpoint) {
        this.events.trigger('notebook_restoring.Notebook', checkpoint);
        var that = this;
        this.contents.delete_checkpoint(this.notebook_path, checkpoint).then(
            $.proxy(this.delete_checkpoint_success, this),
            function (error) {
                that.events.trigger('checkpoint_delete_failed.Notebook', error);
            }
        );
    };

    /**
     * Success callback for deleting a notebook checkpoint.
     */
    Notebook.prototype.delete_checkpoint_success = function () {
        this.events.trigger('checkpoint_deleted.Notebook');
        this.load_notebook(this.notebook_path);
    };

    exports.Notebook = Notebook;

},{"base/js/dialog":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/dialog.js","base/js/keyboard":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/keyboard.js","base/js/namespace":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/namespace.js","base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js","marked":"/Users/jon/jupyter/notebook/node_modules/marked/lib/marked.js","moment":"/Users/jon/jupyter/notebook/node_modules/moment/moment.js","notebook/js/cell":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/cell.js","notebook/js/celltoolbar":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/celltoolbar.js","notebook/js/celltoolbarpresets/default":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/celltoolbarpresets/default.js","notebook/js/celltoolbarpresets/rawcell":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/celltoolbarpresets/rawcell.js","notebook/js/celltoolbarpresets/slideshow":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/celltoolbarpresets/slideshow.js","notebook/js/codecell":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/codecell.js","notebook/js/commandpalette":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/commandpalette.js","notebook/js/mathjaxutils":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/mathjaxutils.js","notebook/js/scrollmanager":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/scrollmanager.js","notebook/js/textcell":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/textcell.js","notebook/js/tooltip":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/tooltip.js","services/config":"/Users/jon/jupyter/notebook/notebook/static-src/services/config.js","services/sessions/session":"/Users/jon/jupyter/notebook/notebook/static-src/services/sessions/session.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/notificationarea.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var utils = require('base/js/utils');
    var dialog = require('base/js/dialog');
    var notificationarea = require('base/js/notificationarea');
    var moment = require('moment');

    var NotificationArea = notificationarea.NotificationArea;

    var NotebookNotificationArea = function(selector, options) {
        NotificationArea.apply(this, [selector, options]);
        this.save_widget = options.save_widget;
        this.notebook = options.notebook;
        this.keyboard_manager = options.keyboard_manager;
    };

    NotebookNotificationArea.prototype = Object.create(NotificationArea.prototype);

    /**
     * Initialize the default set of notification widgets.
     *
     * @method init_notification_widgets
     */
    NotebookNotificationArea.prototype.init_notification_widgets = function () {
        this.init_kernel_notification_widget();
        this.init_notebook_notification_widget();
    };

    /**
     * Initialize the notification widget for kernel status messages.
     *
     * @method init_kernel_notification_widget
     */
    NotebookNotificationArea.prototype.init_kernel_notification_widget = function () {
        var that = this;
        var knw = this.new_notification_widget('kernel');
        var $kernel_ind_icon = $("#kernel_indicator_icon");
        var $modal_ind_icon = $("#modal_indicator");
        var $readonly_ind_icon = $('#readonly-indicator');
        var $body = $('body');

        // Listen for the notebook loaded event.  Set readonly indicator.
        this.events.on('notebook_loaded.Notebook', function() {
            if (that.notebook.writable) {
                $readonly_ind_icon.hide();
            } else {
                $readonly_ind_icon.show();
            }
        });

        // Command/Edit mode
        this.events.on('edit_mode.Notebook', function () {
            that.save_widget.update_document_title();
            $body.addClass('edit_mode');
            $body.removeClass('command_mode');
            $modal_ind_icon.attr('title','Edit Mode');
        });

        this.events.on('command_mode.Notebook', function () {
            that.save_widget.update_document_title();
            $body.removeClass('edit_mode');
            $body.addClass('command_mode');
            $modal_ind_icon.attr('title','Command Mode');
        });

        // Implicitly start off in Command mode, switching to Edit mode will trigger event
        $modal_ind_icon.addClass('modal_indicator').attr('title','Command Mode');
        $body.addClass('command_mode');

        // Kernel events

        // this can be either kernel_created.Kernel or kernel_created.Session
        this.events.on('kernel_created.Kernel kernel_created.Session', function () {
            knw.info("Kernel Created", 500);
        });

        this.events.on('kernel_reconnecting.Kernel', function () {
            knw.warning("Connecting to kernel");
        });

        this.events.on('kernel_connection_dead.Kernel', function (evt, info) {
            knw.danger("Not Connected", undefined, function () {
                // schedule reconnect a short time in the future, don't reconnect immediately
                setTimeout($.proxy(info.kernel.reconnect, info.kernel), 500);
            }, {title: 'click to reconnect'});
        });

        this.events.on('kernel_connected.Kernel', function () {
            knw.info("Connected", 500);
        });

        this.events.on('kernel_restarting.Kernel', function () {
            that.save_widget.update_document_title();
            knw.set_message("Restarting kernel", 2000);
        });

        this.events.on('kernel_autorestarting.Kernel', function (evt, info) {
            // Only show the dialog on the first restart attempt. This
            // number gets tracked by the `Kernel` object and passed
            // along here, because we don't want to show the user 5
            // dialogs saying the same thing (which is the number of
            // times it tries restarting).
            if (info.attempt === 1) {

                dialog.kernel_modal({
                    notebook: that.notebook,
                    keyboard_manager: that.keyboard_manager,
                    title: "Kernel Restarting",
                    body: "The kernel appears to have died. It will restart automatically.",
                    buttons: {
                        OK : {
                            class : "btn-primary"
                        }
                    }
                });
            }

            that.save_widget.update_document_title();
            knw.danger("Dead kernel");
            $kernel_ind_icon.attr('class','kernel_dead_icon').attr('title','Kernel Dead');
        });

        this.events.on('kernel_interrupting.Kernel', function () {
            knw.set_message("Interrupting kernel", 2000);
        });

        this.events.on('kernel_disconnected.Kernel', function () {
            $kernel_ind_icon
                .attr('class', 'kernel_disconnected_icon')
                .attr('title', 'No Connection to Kernel');
        });

        this.events.on('kernel_connection_failed.Kernel', function (evt, info) {
            // only show the dialog if this is the first failed
            // connect attempt, because the kernel will continue
            // trying to reconnect and we don't want to spam the user
            // with messages
            if (info.attempt === 1) {

                var msg = "A connection to the notebook server could not be established." +
                        " The notebook will continue trying to reconnect, but" +
                        " until it does, you will NOT be able to run code. Check your" +
                        " network connection or notebook server configuration.";

                dialog.kernel_modal({
                    title: "Connection failed",
                    body: msg,
                    keyboard_manager: that.keyboard_manager,
                    notebook: that.notebook,
                    buttons : {
                        "OK": {}
                    }
                });
            }
        });

        this.events.on('kernel_killed.Kernel kernel_killed.Session', function () {
            that.save_widget.update_document_title();
            knw.warning("No kernel");
            $kernel_ind_icon.attr('class','kernel_busy_icon').attr('title','Kernel is not running');
        });

        this.events.on('kernel_dead.Kernel', function () {

            var showMsg = function () {

                var msg = 'The kernel has died, and the automatic restart has failed.' +
                        ' It is possible the kernel cannot be restarted.' +
                        ' If you are not able to restart the kernel, you will still be able to save' +
                        ' the notebook, but running code will no longer work until the notebook' +
                        ' is reopened.';

                dialog.kernel_modal({
                    title: "Dead kernel",
                    body : msg,
                    keyboard_manager: that.keyboard_manager,
                    notebook: that.notebook,
                    buttons : {
                        "Try restarting now": {
                            class: "btn-danger",
                            click: function () {
                                that.notebook.start_session();
                            }
                        },
                    "Don't restart": {}
                    }
                });

                return false;
            };

            that.save_widget.update_document_title();
            knw.danger("Dead kernel", undefined, showMsg);
            $kernel_ind_icon.attr('class','kernel_dead_icon').attr('title','Kernel Dead');

            showMsg();
        });
        
        this.events.on("no_kernel.Kernel", function (evt, data) {
            $("#kernel_indicator").find('.kernel_indicator_name').text("No Kernel");
        });

        this.events.on('kernel_dead.Session', function (evt, info) {
            var full = info.xhr.responseJSON.message;
            var short = info.xhr.responseJSON.short_message || 'Kernel error';
            var traceback = info.xhr.responseJSON.traceback;

            var showMsg = function () {
                var msg = $('<div/>').append($('<p/>').text(full));
                var cm, cm_elem, cm_open;

                if (traceback) {
                    cm_elem = $('<div/>')
                        .css('margin-top', '1em')
                        .css('padding', '1em')
                        .addClass('output_scroll');
                    msg.append(cm_elem);
                    cm = CodeMirror(cm_elem.get(0), {
                        mode:  "python",
                        readOnly : true
                    });
                    cm.setValue(traceback);
                    cm_open = $.proxy(cm.refresh, cm);
                }

                dialog.kernel_modal({
                    title: "Failed to start the kernel",
                    body : msg,
                    keyboard_manager: that.keyboard_manager,
                    notebook: that.notebook,
                    open: cm_open,
                    buttons : {
                        "Ok": { class: 'btn-primary' }
                    }
                });

                return false;
            };

            that.save_widget.update_document_title();
            $kernel_ind_icon.attr('class','kernel_dead_icon').attr('title','Kernel Dead');
            knw.danger(short, undefined, showMsg);
        });

        this.events.on('kernel_starting.Kernel kernel_created.Session', function () {
            window.document.title='(Starting) '+window.document.title;
            $kernel_ind_icon.attr('class','kernel_busy_icon').attr('title','Kernel Busy');
            knw.set_message("Kernel starting, please wait...");
        });

        this.events.on('kernel_ready.Kernel', function () {
            that.save_widget.update_document_title();
            $kernel_ind_icon.attr('class','kernel_idle_icon').attr('title','Kernel Idle');
            knw.info("Kernel ready", 500);
        });

        this.events.on('kernel_idle.Kernel', function () {
            that.save_widget.update_document_title();
            $kernel_ind_icon.attr('class','kernel_idle_icon').attr('title','Kernel Idle');
        });

        this.events.on('kernel_busy.Kernel', function () {
            window.document.title='(Busy) '+window.document.title;
            $kernel_ind_icon.attr('class','kernel_busy_icon').attr('title','Kernel Busy');
        });

        this.events.on('spec_match_found.Kernel', function (evt, data) {
            that.widget('kernelspec').info("Using kernel: " + data.found.spec.display_name, 3000, undefined, {
                title: "Only candidate for language: " + data.selected.language + " was " + data.found.spec.display_name
            });
        });

        
        // Start the kernel indicator in the busy state, and send a kernel_info request.
        // When the kernel_info reply arrives, the kernel is idle.
        $kernel_ind_icon.attr('class','kernel_busy_icon').attr('title','Kernel Busy');
    };

    /**
     * Initialize the notification widget for notebook status messages.
     *
     * @method init_notebook_notification_widget
     */
    NotebookNotificationArea.prototype.init_notebook_notification_widget = function () {
        var nnw = this.new_notification_widget('notebook');

        // Notebook events
        this.events.on('notebook_loading.Notebook', function () {
            nnw.set_message("Loading notebook",500);
        });
        this.events.on('notebook_loaded.Notebook', function () {
            nnw.set_message("Notebook loaded",500);
        });
        this.events.on('notebook_saving.Notebook', function () {
            nnw.set_message("Saving notebook",500);
        });
        this.events.on('notebook_saved.Notebook', function () {
            nnw.set_message("Notebook saved",2000);
        });
        this.events.on('notebook_save_failed.Notebook', function (evt, error) {
            nnw.warning(error.message || "Notebook save failed");
        });
        this.events.on('notebook_copy_failed.Notebook', function (evt, error) {
            nnw.warning(error.message || "Notebook copy failed");
        });
        
        // Checkpoint events
        this.events.on('checkpoint_created.Notebook', function (evt, data) {
            var msg = "Checkpoint created";
            if (data.last_modified) {
                var d = new Date(data.last_modified);
                msg = msg + ": " + moment(d).format("HH:mm:ss");
            }
            nnw.set_message(msg, 2000);
        });
        this.events.on('checkpoint_failed.Notebook', function () {
            nnw.warning("Checkpoint failed");
        });
        this.events.on('checkpoint_deleted.Notebook', function () {
            nnw.set_message("Checkpoint deleted", 500);
        });
        this.events.on('checkpoint_delete_failed.Notebook', function () {
            nnw.warning("Checkpoint delete failed");
        });
        this.events.on('checkpoint_restoring.Notebook', function () {
            nnw.set_message("Restoring to checkpoint...", 500);
        });
        this.events.on('checkpoint_restore_failed.Notebook', function () {
            nnw.warning("Checkpoint restore failed");
        });

        // Autosave events
        this.events.on('autosave_disabled.Notebook', function () {
            nnw.set_message("Autosave disabled", 2000);
        });
        this.events.on('autosave_enabled.Notebook', function (evt, interval) {
            nnw.set_message("Saving every " + interval / 1000 + "s", 1000);
        });
    };

    exports.NotebookNotificationArea = NotebookNotificationArea;

},{"base/js/dialog":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/dialog.js","base/js/notificationarea":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/notificationarea.js","base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js","moment":"/Users/jon/jupyter/notebook/node_modules/moment/moment.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/outputarea.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var utils = require('base/js/utils');
    var security = require('base/js/security');
    var keyboard = require('base/js/keyboard');
    var mathjaxutils = require('notebook/js/mathjaxutils');
    var marked = require('marked');

    /**
     * @class OutputArea
     *
     * @constructor
     */

    var OutputArea = function (options) {
        this.selector = options.selector;
        this.events = options.events;
        this.keyboard_manager = options.keyboard_manager;
        this.wrapper = $(options.selector);
        this.outputs = [];
        this.collapsed = false;
        this.scrolled = false;
        this.scroll_state = 'auto';
        this.trusted = true;
        this.clear_queued = null;
        if (options.prompt_area === undefined) {
            this.prompt_area = true;
        } else {
            this.prompt_area = options.prompt_area;
        }
        this.create_elements();
        this.style();
        this.bind_events();
    };


    /**
     * Class prototypes
     **/

    OutputArea.prototype.create_elements = function () {
        this.element = $("<div/>");
        this.collapse_button = $("<div/>");
        this.prompt_overlay = $("<div/>");
        this.wrapper.append(this.prompt_overlay);
        this.wrapper.append(this.element);
        this.wrapper.append(this.collapse_button);
    };


    OutputArea.prototype.style = function () {
        this.collapse_button.hide();
        this.prompt_overlay.hide();
        
        this.wrapper.addClass('output_wrapper');
        this.element.addClass('output');
        
        this.collapse_button.addClass("btn btn-default output_collapsed");
        this.collapse_button.attr('title', 'click to expand output');
        this.collapse_button.text('. . .');
        
        this.prompt_overlay.addClass('out_prompt_overlay prompt');
        this.prompt_overlay.attr('title', 'click to expand output; double click to hide output');
        
        this.collapse();
    };

    /**
     * Should the OutputArea scroll?
     * Returns whether the height (in lines) exceeds the current threshold.
     * Threshold will be OutputArea.minimum_scroll_threshold if scroll_state=true (manually requested)
     * or OutputArea.auto_scroll_threshold if scroll_state='auto'.
     * This will always return false if scroll_state=false (scroll disabled).
     *
     */
    OutputArea.prototype._should_scroll = function () {
        var threshold;
        if (this.scroll_state === false) {
            return false;
        } else if (this.scroll_state === true) {
            threshold = OutputArea.minimum_scroll_threshold;
        } else {
            threshold = OutputArea.auto_scroll_threshold;
        }
        if (threshold <=0) {
            return false;
        }
        // line-height from http://stackoverflow.com/questions/1185151
        var fontSize = this.element.css('font-size');
        var lineHeight = Math.floor(parseInt(fontSize.replace('px','')) * 1.5);
        return (this.element.height() > threshold * lineHeight);
    };


    OutputArea.prototype.bind_events = function () {
        var that = this;
        this.prompt_overlay.dblclick(function () { that.toggle_output(); });
        this.prompt_overlay.click(function () { that.toggle_scroll(); });

        this.element.resize(function () {
            // FIXME: Firefox on Linux misbehaves, so automatic scrolling is disabled
            if ( utils.browser[0] === "Firefox" ) {
                return;
            }
            // maybe scroll output,
            // if it's grown large enough and hasn't already been scrolled.
            if (!that.scrolled && that._should_scroll()) {
                that.scroll_area();
            }
        });
        this.collapse_button.click(function () {
            that.expand();
        });
    };


    OutputArea.prototype.collapse = function () {
        if (!this.collapsed) {
            this.element.hide();
            this.prompt_overlay.hide();
            if (this.element.html()){
                this.collapse_button.show();
            }
            this.collapsed = true;
            // collapsing output clears scroll state
            this.scroll_state = 'auto';
        }
    };


    OutputArea.prototype.expand = function () {
        if (this.collapsed) {
            this.collapse_button.hide();
            this.element.show();
            if (this.prompt_area) {
                this.prompt_overlay.show();
            }
            this.collapsed = false;
            this.scroll_if_long();
        }
    };


    OutputArea.prototype.toggle_output = function () {
        if (this.collapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    };


    OutputArea.prototype.scroll_area = function () {
        this.element.addClass('output_scroll');
        this.prompt_overlay.attr('title', 'click to unscroll output; double click to hide');
        this.scrolled = true;
    };


    OutputArea.prototype.unscroll_area = function () {
        this.element.removeClass('output_scroll');
        this.prompt_overlay.attr('title', 'click to scroll output; double click to hide');
        this.scrolled = false;
    };

    /**
     * Scroll OutputArea if height exceeds a threshold.
     *
     * Threshold is OutputArea.minimum_scroll_threshold if scroll_state = true,
     * OutputArea.auto_scroll_threshold if scroll_state='auto'.
     *
     **/
    OutputArea.prototype.scroll_if_long = function () {
        var should_scroll = this._should_scroll();
        if (!this.scrolled && should_scroll) {
            // only allow scrolling long-enough output
            this.scroll_area();
        } else if (this.scrolled && !should_scroll) {
            // scrolled and shouldn't be
            this.unscroll_area();
        }
    };


    OutputArea.prototype.toggle_scroll = function () {
        if (this.scroll_state == 'auto') {
            this.scroll_state = !this.scrolled;
        } else {
            this.scroll_state = !this.scroll_state;
        }
        if (this.scrolled) {
            this.unscroll_area();
        } else {
            // only allow scrolling long-enough output
            this.scroll_if_long();
        }
    };


    // typeset with MathJax if MathJax is available
    OutputArea.prototype.typeset = function () {
        utils.typeset(this.element);
    };


    OutputArea.prototype.handle_output = function (msg) {
        var json = {};
        var msg_type = json.output_type = msg.header.msg_type;
        var content = msg.content;
        if (msg_type === "stream") {
            json.text = content.text;
            json.name = content.name;
        } else if (msg_type === "display_data") {
            json.data = content.data;
            json.metadata = content.metadata;
        } else if (msg_type === "execute_result") {
            json.data = content.data;
            json.metadata = content.metadata;
            json.execution_count = content.execution_count;
        } else if (msg_type === "error") {
            json.ename = content.ename;
            json.evalue = content.evalue;
            json.traceback = content.traceback;
        } else {
            console.log("unhandled output message", msg);
            return;
        }
        this.append_output(json);
    };


    OutputArea.output_types = [
        'application/javascript',
        'text/html',
        'text/markdown',
        'text/latex',
        'image/svg+xml',
        'image/png',
        'image/jpeg',
        'application/pdf',
        'text/plain'
    ];

    OutputArea.prototype.validate_mimebundle = function (bundle) {
        /** scrub invalid outputs */
        if (typeof bundle.data !== 'object') {
            console.warn("mimebundle missing data", bundle);
            bundle.data = {};
        }
        if (typeof bundle.metadata !== 'object') {
            console.warn("mimebundle missing metadata", bundle);
            bundle.metadata = {};
        }
        var data = bundle.data;
        $.map(OutputArea.output_types, function(key){
            if (key !== 'application/json' &&
                data[key] !== undefined &&
                typeof data[key] !== 'string'
            ) {
                console.log("Invalid type for " + key, data[key]);
                delete data[key];
            }
        });
        return bundle;
    };

    OutputArea.prototype.append_output = function (json) {
        this.expand();
        
        // Clear the output if clear is queued.
        var needs_height_reset = false;
        if (this.clear_queued) {
            this.clear_output(false);
            needs_height_reset = true;
        }

        var record_output = true;
        switch(json.output_type) {
            case 'execute_result':
                json = this.validate_mimebundle(json);
                this.append_execute_result(json);
                break;
            case 'stream':
                // append_stream might have merged the output with earlier stream output
                record_output = this.append_stream(json);
                break;
            case 'error':
                this.append_error(json);
                break;
            case 'display_data':
                // append handled below
                json = this.validate_mimebundle(json);
                break;
            default:
                console.log("unrecognized output type: " + json.output_type);
                this.append_unrecognized(json);
        }

        // We must release the animation fixed height in a callback since Gecko
        // (FireFox) doesn't render the image immediately as the data is 
        // available.
        var that = this;
        var handle_appended = function ($el) {
            /**
             * Only reset the height to automatic if the height is currently
             * fixed (done by wait=True flag on clear_output).
             */
            if (needs_height_reset) {
                that.element.height('');
            }
            that.element.trigger('resize');
        };
        if (json.output_type === 'display_data') {
            this.append_display_data(json, handle_appended);
        } else {
            handle_appended();
        }
        
        if (record_output) {
            this.outputs.push(json);
        }
    };


    OutputArea.prototype.create_output_area = function () {
        var oa = $("<div/>").addClass("output_area");
        if (this.prompt_area) {
            oa.append($('<div/>').addClass('prompt'));
        }
        return oa;
    };


    function _get_metadata_key(metadata, key, mime) {
        var mime_md = metadata[mime];
        // mime-specific higher priority
        if (mime_md && mime_md[key] !== undefined) {
            return mime_md[key];
        }
        // fallback on global
        return metadata[key];
    }

    OutputArea.prototype.create_output_subarea = function(md, classes, mime) {
        var subarea = $('<div/>').addClass('output_subarea').addClass(classes);
        if (_get_metadata_key(md, 'isolated', mime)) {
            // Create an iframe to isolate the subarea from the rest of the
            // document
            var iframe = $('<iframe/>').addClass('box-flex1');
            iframe.css({'height':1, 'width':'100%', 'display':'block'});
            iframe.attr('frameborder', 0);
            iframe.attr('scrolling', 'auto');

            // Once the iframe is loaded, the subarea is dynamically inserted
            iframe.on('load', function() {
                // Workaround needed by Firefox, to properly render svg inside
                // iframes, see http://stackoverflow.com/questions/10177190/
                // svg-dynamically-added-to-iframe-does-not-render-correctly
                this.contentDocument.open();

                // Insert the subarea into the iframe
                // We must directly write the html. When using Jquery's append
                // method, javascript is evaluated in the parent document and
                // not in the iframe document.  At this point, subarea doesn't
                // contain any user content.
                this.contentDocument.write(subarea.html());

                this.contentDocument.close();

                var body = this.contentDocument.body;
                // Adjust the iframe height automatically
                iframe.height(body.scrollHeight + 'px');
            });

            // Elements should be appended to the inner subarea and not to the
            // iframe
            iframe.append = function(that) {
                subarea.append(that);
            };

            return iframe;
        } else {
            return subarea;
        }
    };


    OutputArea.prototype._append_javascript_error = function (err, element) {
        /**
         * display a message when a javascript error occurs in display output
         */
        var msg = "Javascript error adding output!";
        if ( element === undefined ) return;
        element
            .append($('<div/>').text(msg).addClass('js-error'))
            .append($('<div/>').text(err.toString()).addClass('js-error'))
            .append($('<div/>').text('See your browser Javascript console for more details.').addClass('js-error'));
    };

    OutputArea.prototype._safe_append = function (toinsert) {
        /**
         * safely append an item to the document
         * this is an object created by user code,
         * and may have errors, which should not be raised
         * under any circumstances.
         */
        try {
            this.element.append(toinsert);
        } catch(err) {
            console.log(err);
            // Create an actual output_area and output_subarea, which creates
            // the prompt area and the proper indentation.
            var toinsert = this.create_output_area();
            var subarea = $('<div/>').addClass('output_subarea');
            toinsert.append(subarea);
            this._append_javascript_error(err, subarea);
            this.element.append(toinsert);
        }

        // Notify others of changes.
        this.element.trigger('changed');
    };


    OutputArea.prototype.append_execute_result = function (json) {
        var n = json.execution_count || ' ';
        var toinsert = this.create_output_area();
        if (this.prompt_area) {
            toinsert.find('div.prompt').addClass('output_prompt').text('Out[' + n + ']:');
        }
        var inserted = this.append_mime_type(json, toinsert);
        if (inserted) {
            inserted.addClass('output_result');
        }
        this._safe_append(toinsert);
        // If we just output latex, typeset it.
        if ((json.data['text/latex'] !== undefined) ||
            (json.data['text/html'] !== undefined) ||
            (json.data['text/markdown'] !== undefined)) {
            this.typeset();
        }
    };


    OutputArea.prototype.append_error = function (json) {
        var tb = json.traceback;
        if (tb !== undefined && tb.length > 0) {
            var s = '';
            var len = tb.length;
            for (var i=0; i<len; i++) {
                s = s + tb[i] + '\n';
            }
            s = s + '\n';
            var toinsert = this.create_output_area();
            var append_text = OutputArea.append_map['text/plain'];
            if (append_text) {
                append_text.apply(this, [s, {}, toinsert]).addClass('output_error');
            }
            this._safe_append(toinsert);
        }
    };


    OutputArea.prototype.append_stream = function (json) {
        var text = json.text;
        if (typeof text !== 'string') {
            console.error("Stream output is invalid (missing text)", json);
            return false;
        }
        var subclass = "output_"+json.name;
        if (this.outputs.length > 0){
            // have at least one output to consider
            var last = this.outputs[this.outputs.length-1];
            if (last.output_type == 'stream' && json.name == last.name){
                // latest output was in the same stream,
                // so append directly into its pre tag
                // escape ANSI & HTML specials:
                last.text = utils.fixCarriageReturn(last.text + json.text);
                var pre = this.element.find('div.'+subclass).last().find('pre');
                var html = utils.fixConsole(last.text);
                html = utils.autoLinkUrls(html);
                // The only user content injected with this HTML call is
                // escaped by the fixConsole() method.
                pre.html(html);
                // return false signals that we merged this output with the previous one,
                // and the new output shouldn't be recorded.
                return false;
            }
        }

        if (!text.replace("\r", "")) {
            // text is nothing (empty string, \r, etc.)
            // so don't append any elements, which might add undesirable space
            // return true to indicate the output should be recorded.
            return true;
        }

        // If we got here, attach a new div
        var toinsert = this.create_output_area();
        var append_text = OutputArea.append_map['text/plain'];
        if (append_text) {
            append_text.apply(this, [text, {}, toinsert]).addClass("output_stream " + subclass);
        }
        this._safe_append(toinsert);
        return true;
    };


    OutputArea.prototype.append_unrecognized = function (json) {
        var that = this;
        var toinsert = this.create_output_area();
        var subarea = $('<div/>').addClass('output_subarea output_unrecognized');
        toinsert.append(subarea);
        subarea.append(
            $("<a>")
                .attr("href", "#")
                .text("Unrecognized output: " + json.output_type)
                .click(function () {
                    that.events.trigger('unrecognized_output.OutputArea', {output: json});
                })
        );
        this._safe_append(toinsert);
    };


    OutputArea.prototype.append_display_data = function (json, handle_inserted) {
        var toinsert = this.create_output_area();
        if (this.append_mime_type(json, toinsert, handle_inserted)) {
            this._safe_append(toinsert);
            // If we just output latex, typeset it.
            if ((json.data['text/latex'] !== undefined) ||
                (json.data['text/html'] !== undefined) ||
                (json.data['text/markdown'] !== undefined)) {
                this.typeset();
            }
        }
    };


    OutputArea.safe_outputs = {
        'text/plain' : true,
        'text/latex' : true,
        'image/png' : true,
        'image/jpeg' : true
    };

    OutputArea.prototype.append_mime_type = function (json, element, handle_inserted) {
        for (var i=0; i < OutputArea.display_order.length; i++) {
            var type = OutputArea.display_order[i];
            var append = OutputArea.append_map[type];
            if ((json.data[type] !== undefined) && append) {
                var value = json.data[type];
                if (!this.trusted && !OutputArea.safe_outputs[type]) {
                    // not trusted, sanitize HTML
                    if (type==='text/html' || type==='text/svg') {
                        value = security.sanitize_html(value);
                    } else {
                        // don't display if we don't know how to sanitize it
                        console.log("Ignoring untrusted " + type + " output.");
                        continue;
                    }
                }
                var md = json.metadata || {};
                var toinsert = append.apply(this, [value, md, element, handle_inserted]);
                // Since only the png and jpeg mime types call the inserted
                // callback, if the mime type is something other we must call the 
                // inserted callback only when the element is actually inserted
                // into the DOM.  Use a timeout of 0 to do this.
                if (['image/png', 'image/jpeg'].indexOf(type) < 0 && handle_inserted !== undefined) {
                    setTimeout(handle_inserted, 0);
                }
                this.events.trigger('output_appended.OutputArea', [type, value, md, toinsert]);
                return toinsert;
            }
        }
        return null;
    };


    var append_html = function (html, md, element) {
        var type = 'text/html';
        var toinsert = this.create_output_subarea(md, "output_html rendered_html", type);
        this.keyboard_manager.register_events(toinsert);
        toinsert.append(html);
        dblclick_to_reset_size(toinsert.find('img'));
        element.append(toinsert);
        return toinsert;
    };


    var append_markdown = function(markdown, md, element) {
        var type = 'text/markdown';
        var toinsert = this.create_output_subarea(md, "output_markdown rendered_html", type);
        var text_and_math = mathjaxutils.remove_math(markdown);
        var text = text_and_math[0];
        var math = text_and_math[1];
        marked(text, function (err, html) {
            html = mathjaxutils.replace_math(html, math);
            toinsert.append(html);
        });
        dblclick_to_reset_size(toinsert.find('img'));
        element.append(toinsert);
        return toinsert;
    };


    var append_javascript = function (js, md, element) {
        /**
         * We just eval the JS code, element appears in the local scope.
         */
        var type = 'application/javascript';
        var toinsert = this.create_output_subarea(md, "output_javascript rendered_html", type);
        this.keyboard_manager.register_events(toinsert);
        element.append(toinsert);

        // Fix for ipython/issues/5293, make sure `element` is the area which
        // output can be inserted into at the time of JS execution.
        element = toinsert;
        try {
            eval(js);
        } catch(err) {
            console.log(err);
            this._append_javascript_error(err, toinsert);
        }
        return toinsert;
    };


    var append_text = function (data, md, element) {
        var type = 'text/plain';
        var toinsert = this.create_output_subarea(md, "output_text", type);
        // escape ANSI & HTML specials in plaintext:
        data = utils.fixConsole(data);
        data = utils.fixCarriageReturn(data);
        data = utils.autoLinkUrls(data);
        // The only user content injected with this HTML call is
        // escaped by the fixConsole() method.
        toinsert.append($("<pre/>").html(data));
        element.append(toinsert);
        return toinsert;
    };


    var append_svg = function (svg_html, md, element) {
        var type = 'image/svg+xml';
        var toinsert = this.create_output_subarea(md, "output_svg", type);

        // Get the svg element from within the HTML.
        var svg = $('<div />').html(svg_html).find('svg');
        var svg_area = $('<div />');
        var width = svg.attr('width');
        var height = svg.attr('height');
        svg
            .width('100%')
            .height('100%');
        svg_area
            .width(width)
            .height(height);

        svg_area.append(svg);
        toinsert.append(svg_area);
        element.append(toinsert);

        return toinsert;
    };

    function dblclick_to_reset_size (img) {
        /**
         * Double-click on an image toggles confinement to notebook width
         *
         * img: jQuery element
         */

        img.dblclick(function () {
            // dblclick toggles *raw* size, disabling max-width confinement.
            if (img.hasClass('unconfined')) {
                img.removeClass('unconfined');
            } else {
                img.addClass('unconfined');
            }
        });
    };

    var set_width_height = function (img, md, mime) {
        /**
         * set width and height of an img element from metadata
         */
        var height = _get_metadata_key(md, 'height', mime);
        if (height !== undefined) img.attr('height', height);
        var width = _get_metadata_key(md, 'width', mime);
        if (width !== undefined) img.attr('width', width);
        if (_get_metadata_key(md, 'unconfined', mime)) {
            img.addClass('unconfined');
        }
    };

    var append_png = function (png, md, element, handle_inserted) {
        var type = 'image/png';
        var toinsert = this.create_output_subarea(md, "output_png", type);
        var img = $("<img/>");
        if (handle_inserted !== undefined) {
            img.on('load', function(){
                handle_inserted(img);
            });
        }
        img[0].src = 'data:image/png;base64,'+ png;
        set_width_height(img, md, 'image/png');
        dblclick_to_reset_size(img);
        toinsert.append(img);
        element.append(toinsert);
        return toinsert;
    };


    var append_jpeg = function (jpeg, md, element, handle_inserted) {
        var type = 'image/jpeg';
        var toinsert = this.create_output_subarea(md, "output_jpeg", type);
        var img = $("<img/>");
        if (handle_inserted !== undefined) {
            img.on('load', function(){
                handle_inserted(img);
            });
        }
        img[0].src = 'data:image/jpeg;base64,'+ jpeg;
        set_width_height(img, md, 'image/jpeg');
        dblclick_to_reset_size(img);
        toinsert.append(img);
        element.append(toinsert);
        return toinsert;
    };


    var append_pdf = function (pdf, md, element) {
        var type = 'application/pdf';
        var toinsert = this.create_output_subarea(md, "output_pdf", type);
        var a = $('<a/>').attr('href', 'data:application/pdf;base64,'+pdf);
        a.attr('target', '_blank');
        a.text('View PDF');
        toinsert.append(a);
        element.append(toinsert);
        return toinsert;
     };

    var append_latex = function (latex, md, element) {
        /**
         * This method cannot do the typesetting because the latex first has to
         * be on the page.
         */
        var type = 'text/latex';
        var toinsert = this.create_output_subarea(md, "output_latex", type);
        toinsert.append(latex);
        element.append(toinsert);
        return toinsert;
    };


    OutputArea.prototype.append_raw_input = function (msg) {
        var that = this;
        this.expand();
        var content = msg.content;
        var area = this.create_output_area();
        
        // disable any other raw_inputs, if they are left around
        $("div.output_subarea.raw_input_container").remove();
        
        var input_type = content.password ? 'password' : 'text';
        
        area.append(
            $("<div/>")
            .addClass("box-flex1 output_subarea raw_input_container")
            .append(
                $("<pre/>")
                .addClass("raw_input_prompt")
                .text(content.prompt)
                .append(
                    $("<input/>")
                    .addClass("raw_input")
                    .attr('type', input_type)
                    .attr("size", 47)
                    .keydown(function (event, ui) {
                        // make sure we submit on enter,
                        // and don't re-execute the *cell* on shift-enter
                        if (event.which === keyboard.keycodes.enter) {
                            that._submit_raw_input();
                            return false;
                        }
                    })
                )
            )
        );
        
        this.element.append(area);
        var raw_input = area.find('input.raw_input');
        // Register events that enable/disable the keyboard manager while raw
        // input is focused.
        this.keyboard_manager.register_events(raw_input);
        // Note, the following line used to read raw_input.focus().focus().
        // This seemed to be needed otherwise only the cell would be focused.
        // But with the modal UI, this seems to work fine with one call to focus().
        raw_input.focus();
    };

    OutputArea.prototype._submit_raw_input = function (evt) {
        var container = this.element.find("div.raw_input_container");
        var theprompt = container.find("pre.raw_input_prompt");
        var theinput = container.find("input.raw_input");
        var value = theinput.val();
        var echo  = value;
        // don't echo if it's a password
        if (theinput.attr('type') == 'password') {
            echo = '········';
        }
        var content = {
            output_type : 'stream',
            name : 'stdout',
            text : theprompt.text() + echo + '\n'
        };
        // remove form container
        container.parent().remove();
        // replace with plaintext version in stdout
        this.append_output(content, false);
        this.events.trigger('send_input_reply.Kernel', value);
    };


    OutputArea.prototype.handle_clear_output = function (msg) {
        /**
         * msg spec v4 had stdout, stderr, display keys
         * v4.1 replaced these with just wait
         * The default behavior is the same (stdout=stderr=display=True, wait=False),
         * so v4 messages will still be properly handled,
         * except for the rarely used clearing less than all output.
         */
        this.clear_output(msg.content.wait || false);
    };


    OutputArea.prototype.clear_output = function(wait, ignore_que) {
        if (wait) {

            // If a clear is queued, clear before adding another to the queue.
            if (this.clear_queued) {
                this.clear_output(false);
            }

            this.clear_queued = true;
        } else {

            // Fix the output div's height if the clear_output is waiting for
            // new output (it is being used in an animation).
            if (!ignore_que && this.clear_queued) {
                var height = this.element.height();
                this.element.height(height);
                this.clear_queued = false;
            }
            
            // Clear all
            // Remove load event handlers from img tags because we don't want
            // them to fire if the image is never added to the page.
            this.element.find('img').off('load');
            this.element.html("");

            // Notify others of changes.
            this.element.trigger('changed');
            
            this.outputs = [];
            this.trusted = true;
            this.unscroll_area();
            return;
        }
    };


    // JSON serialization

    OutputArea.prototype.fromJSON = function (outputs, metadata) {
        var len = outputs.length;
        metadata = metadata || {};

        for (var i=0; i<len; i++) {
            this.append_output(outputs[i]);
        }
        if (metadata.collapsed !== undefined) {
            if (metadata.collapsed) {
                this.collapse();
            } else {
                this.expand();
            }
        }
        if (metadata.scrolled !== undefined) {
            this.scroll_state = metadata.scrolled;
            if (metadata.scrolled) {
                this.scroll_if_long();
            } else {
                this.unscroll_area();
            }
        }
    };


    OutputArea.prototype.toJSON = function () {
        return this.outputs;
    };

    /**
     * Class properties
     **/

    /**
     * Threshold to trigger autoscroll when the OutputArea is resized,
     * typically when new outputs are added.
     *
     * Behavior is undefined if autoscroll is lower than minimum_scroll_threshold,
     * unless it is < 0, in which case autoscroll will never be triggered
     *
     * @property auto_scroll_threshold
     * @type Number
     * @default 100
     *
     **/
    OutputArea.auto_scroll_threshold = 100;

    /**
     * Lower limit (in lines) for OutputArea to be made scrollable. OutputAreas
     * shorter than this are never scrolled.
     *
     * @property minimum_scroll_threshold
     * @type Number
     * @default 20
     *
     **/
    OutputArea.minimum_scroll_threshold = 20;


    OutputArea.display_order = [
        'application/javascript',
        'text/html',
        'text/markdown',
        'text/latex',
        'image/svg+xml',
        'image/png',
        'image/jpeg',
        'application/pdf',
        'text/plain'
    ];

    OutputArea.append_map = {
        "text/plain" : append_text,
        "text/html" : append_html,
        "text/markdown": append_markdown,
        "image/svg+xml" : append_svg,
        "image/png" : append_png,
        "image/jpeg" : append_jpeg,
        "text/latex" : append_latex,
        "application/javascript" : append_javascript,
        "application/pdf" : append_pdf
    };

    exports.OutputArea = OutputArea;

},{"base/js/keyboard":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/keyboard.js","base/js/security":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/security.js","base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js","marked":"/Users/jon/jupyter/notebook/node_modules/marked/lib/marked.js","notebook/js/mathjaxutils":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/mathjaxutils.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/pager.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var utils = require('base/js/utils');

    var Pager = function (pager_selector, options) {
        /**
         * Constructor
         *
         * Parameters:
         *  pager_selector: string
         *  options: dictionary
         *      Dictionary of keyword arguments.
         *          events: $(Events) instance
         */
        this.events = options.events;
        this.pager_element = $(pager_selector);
        this.pager_button_area = $('#pager-button-area');
        this._default_end_space = 100;
        this.pager_element.resizable({handles: 'n', resize: $.proxy(this._resize, this)});
        this.expanded = false;
        this.create_button_area();
        this.bind_events();
    };

    Pager.prototype.create_button_area = function(){
        var that = this;
        this.pager_button_area.append(
            $('<a>').attr('role', "button")
                    .attr('title',"Open the pager in an external window")
                    .addClass('ui-button')
                    .click(function(){that.detach();})
                    .append(
                        $('<span>').addClass("ui-icon ui-icon-extlink")
                    )
        );
        this.pager_button_area.append(
            $('<a>').attr('role', "button")
                    .attr('title',"Close the pager")
                    .addClass('ui-button')
                    .click(function(){that.collapse();})
                    .append(
                        $('<span>').addClass("ui-icon ui-icon-close")
                    )
        );
    };


    Pager.prototype.bind_events = function () {
        var that = this;

        this.pager_element.bind('collapse_pager', function (event, extrap) {
            // Animate hiding of the pager.
            var time = (extrap && extrap.duration) ? extrap.duration : 'fast';
            that.pager_element.animate({
                height: 'toggle'
            }, {
                duration: time,
                done: function() {
                    $('.end_space').css('height', that._default_end_space);
                }
            });
        });

        this.pager_element.bind('expand_pager', function (event, extrap) {
            // Clear the pager's height attr if it's set.  This allows the
            // pager to size itself according to its contents.
            that.pager_element.height('initial');

            // Animate the showing of the pager
            var time = (extrap && extrap.duration) ? extrap.duration : 'fast';
            that.pager_element.show(time, function() {
                // Explicitly set pager height once the pager has shown itself.
                // This allows the pager-contents div to use percentage sizing.
                that.pager_element.height(that.pager_element.height());
                that._resize();
            });
        });

        this.events.on('open_with_text.Pager', function (event, payload) {
            // FIXME: support other mime types with generic mimebundle display
            // mechanism
            if (payload.data['text/html'] && payload.data['text/html'] !== "") {
                that.clear();
                that.expand();
                that.append(payload.data['text/html']);
            } else if (payload.data['text/plain'] && payload.data['text/plain'] !== "") {
                that.clear();
                that.expand();
                that.append_text(payload.data['text/plain']);
            }
        });
    };


    Pager.prototype.collapse = function (extrap) {
        if (this.expanded === true) {
            this.expanded = false;
            this.pager_element.trigger('collapse_pager', extrap);
        }
    };


    Pager.prototype.expand = function (extrap) {
        if (this.expanded !== true) {
            this.expanded = true;
            this.pager_element.trigger('expand_pager', extrap);
        }
    };


    Pager.prototype.toggle = function () {
        if (this.expanded === true) {
            this.collapse();
        } else {
            this.expand();
        }
    };


    Pager.prototype.clear = function (text) {
        this.pager_element.find(".container").empty();
    };

    Pager.prototype.detach = function(){
        var w = window.open("","_blank");
        $(w.document.head)
        .append(
                $('<link>')
                .attr('rel',"stylesheet")
                .attr('href',"/static/css/notebook.css")
                .attr('type',"text/css")
        )
        .append(
                $('<title>').text("Jupyter Pager")
        );
        var pager_body = $(w.document.body);
        pager_body.css('overflow','scroll');

        pager_body.append(this.pager_element.clone().children());
        w.document.close();
        this.collapse();
    };

    Pager.prototype.append_text = function (text) {
        /**
         * The only user content injected with this HTML call is escaped by
         * the fixConsole() method.
         */
        this.pager_element.find(".container").append($('<pre/>').html(utils.fixCarriageReturn(utils.fixConsole(text))));
    };


    Pager.prototype._resize = function() {
        /**
         * Update document based on pager size.
         */
        
        // Make sure the padding at the end of the notebook is large
        // enough that the user can scroll to the bottom of the 
        // notebook.
        $('.end_space').css('height', Math.max(this.pager_element.height(), this._default_end_space));
    };

    exports.Pager = Pager;

},{"base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/quickhelp.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var utils = require('base/js/utils');
    var dialog = require('base/js/dialog');

    var platform = utils.platform;

    var QuickHelp = function (options) {
        /**
         * Constructor
         *
         * Parameters:
         *  options: dictionary
         *      Dictionary of keyword arguments.
         *          events: $(Events) instance
         *          keyboard_manager: KeyboardManager instance
         *          notebook: Notebook instance
         */
        this.keyboard_manager = options.keyboard_manager;
        this.notebook = options.notebook;
        this.keyboard_manager.quick_help = this;
        this.events = options.events;
    };

    var cmd_ctrl = 'Ctrl-';
    var platform_specific;

    if (platform === 'MacOS') {
        // Mac OS X specific
        cmd_ctrl = 'Cmd-';
        platform_specific = [
            { shortcut: "Cmd-Up",     help:"go to cell start"  },
            { shortcut: "Cmd-Down",   help:"go to cell end"  },
            { shortcut: "Alt-Left",   help:"go one word left"  },
            { shortcut: "Alt-Right",  help:"go one word right"  },
            { shortcut: "Alt-Backspace",      help:"delete word before"  },
            { shortcut: "Alt-Delete",         help:"delete word after"  },
        ];
    } else {
        // PC specific
        platform_specific = [
            { shortcut: "Ctrl-Home",  help:"go to cell start"  },
            { shortcut: "Ctrl-Up",     help:"go to cell start"  },
            { shortcut: "Ctrl-End",   help:"go to cell end"  },
            { shortcut: "Ctrl-Down",  help:"go to cell end"  },
            { shortcut: "Ctrl-Left",  help:"go one word left"  },
            { shortcut: "Ctrl-Right", help:"go one word right"  },
            { shortcut: "Ctrl-Backspace", help:"delete word before"  },
            { shortcut: "Ctrl-Delete",    help:"delete word after"  },
        ];
    }

    var cm_shortcuts = [
        { shortcut:"Tab",   help:"code completion or indent" },
        { shortcut:"Shift-Tab",   help:"tooltip" },
        { shortcut: cmd_ctrl + "]",   help:"indent"  },
        { shortcut: cmd_ctrl + "[",   help:"dedent"  },
        { shortcut: cmd_ctrl + "a",   help:"select all"  },
        { shortcut: cmd_ctrl + "z",   help:"undo"  },
        { shortcut: cmd_ctrl + "Shift-z",   help:"redo"  },
        { shortcut: cmd_ctrl + "y",   help:"redo"  },
    ].concat( platform_specific );

    var mac_humanize_map = {
        // all these are unicode, will probably display badly on anything except macs.
        // these are the standard symbol that are used in MacOS native menus
        // cf http://apple.stackexchange.com/questions/55727/
        // for htmlentities and/or unicode value
        'cmd':'⌘',
        'shift':'⇧',
        'alt':'⌥',
        'up':'↑',
        'down':'↓',
        'left':'←',
        'right':'→',
        'eject':'⏏',
        'tab':'⇥',
        'backtab':'⇤',
        'capslock':'⇪',
        'esc':'esc',
        'ctrl':'⌃',
        'enter':'↩',
        'pageup':'⇞',
        'pagedown':'⇟',
        'home':'↖',
        'end':'↘',
        'altenter':'⌤',
        'space':'␣',
        'delete':'⌦',
        'backspace':'⌫',
        'apple':'',
    };

    var default_humanize_map = {
        'shift':'Shift',
        'alt':'Alt',
        'up':'Up',
        'down':'Down',
        'left':'Left',
        'right':'Right',
        'tab':'Tab',
        'capslock':'Caps Lock',
        'esc':'Esc',
        'ctrl':'Ctrl',
        'enter':'Enter',
        'pageup':'Page Up',
        'pagedown':'Page Down',
        'home':'Home',
        'end':'End',
        'space':'Space',
        'backspace':'Backspace',
        };

    var humanize_map;

    if (platform === 'MacOS'){
        humanize_map = mac_humanize_map;
    } else {
        humanize_map = default_humanize_map;
    }

    var special_case = { pageup: "PageUp", pagedown: "Page Down", 'minus': '-' };
    
    function humanize_key(key){
        if (key.length === 1){
            return key.toUpperCase();
        }

        key = humanize_map[key.toLowerCase()]||key;
        
        if (key.indexOf(',') === -1){
            return  ( special_case[key] ? special_case[key] : key.charAt(0).toUpperCase() + key.slice(1) );
        }
    }

    // return an **html** string of the keyboard shortcut
    // for human eyes consumption.
    // the sequence is a string, comma sepparated linkt of shortcut,
    // where the shortcut is a list of dash-joined keys.
    // Each shortcut will be wrapped in <kbd> tag, and joined by comma is in a
    // sequence.
    //
    // Depending on the platform each shortcut will be normalized, with or without dashes.
    // and replace with the corresponding unicode symbol for modifier if necessary.
    function humanize_sequence(sequence){
        var joinchar = ',';
        var hum = _.map(sequence.replace(/meta/g, 'cmd').split(','), humanize_shortcut).join(joinchar);
        return hum;
    }

    function humanize_shortcut(shortcut){
        var joinchar = '-';
        if (platform === 'MacOS'){
            joinchar = '';
        }
        var sh = _.map(shortcut.split('-'), humanize_key ).join(joinchar);
        return '<kbd>'+sh+'</kbd>';
    }
    

    QuickHelp.prototype.show_keyboard_shortcuts = function () {
        /**
         * toggles display of keyboard shortcut dialog
         */
        var that = this;
        if ( this.force_rebuild ) {
            this.shortcut_dialog.remove();
            delete(this.shortcut_dialog);
            this.force_rebuild = false;
        }
        if ( this.shortcut_dialog ){
            // if dialog is already shown, close it
            $(this.shortcut_dialog).modal("toggle");
            return;
        }
        var command_shortcuts = this.keyboard_manager.command_shortcuts.help();
        var edit_shortcuts = this.keyboard_manager.edit_shortcuts.help();
        var help, shortcut;
        var i, half, n;
        var element = $('<div/>');

        // The documentation
        var doc = $('<div/>').addClass('alert alert-info');
        doc.append(
            'The Jupyter Notebook has two different keyboard input modes. <b>Edit mode</b> '+
            'allows you to type code/text into a cell and is indicated by a green cell '+
            'border. <b>Command mode</b> binds the keyboard to notebook level actions '+
            'and is indicated by a grey cell border.'
        );
        if (platform === 'MacOS') {
            var key_div = this.build_key_names();
            doc.append(key_div);
        }
        element.append(doc);

        // Command mode
        var cmd_div = this.build_command_help();
        element.append(cmd_div);

        // Edit mode
        var edit_div = this.build_edit_help(cm_shortcuts);
        element.append(edit_div);

        this.shortcut_dialog = dialog.modal({
            title : "Keyboard shortcuts",
            body : element,
            destroy : false,
            buttons : {
                Close : {}
            },
            notebook: this.notebook,
            keyboard_manager: this.keyboard_manager,
        });
        this.shortcut_dialog.addClass("modal_stretch");
        
        this.events.on('rebuild.QuickHelp', function() { that.force_rebuild = true;});
    };

    QuickHelp.prototype.build_key_names = function () {
       var key_names_mac =  [{ shortcut:"⌘", help:"Command" },
                    { shortcut:"⌃", help:"Control" },
                    { shortcut:"⌥", help:"Option" },
                    { shortcut:"⇧", help:"Shift" },
                    { shortcut:"↩", help:"Return" },
                    { shortcut:"␣", help:"Space" },
                    { shortcut:"⇥", help:"Tab" }];
        var i, half, n;
        var div = $('<div/>').append('MacOS modifier keys:');
        var sub_div = $('<div/>').addClass('container-fluid');
        var col1 = $('<div/>').addClass('col-md-6');
        var col2 = $('<div/>').addClass('col-md-6');
        n = key_names_mac.length;
        half = ~~(n/2);
        for (i=0; i<half; i++) { col1.append(
                build_one(key_names_mac[i])
                ); }
        for (i=half; i<n; i++) { col2.append(
                build_one(key_names_mac[i])
                ); }
        sub_div.append(col1).append(col2);
        div.append(sub_div);
        return div;
    };


    QuickHelp.prototype.build_command_help = function () {
        var command_shortcuts = this.keyboard_manager.command_shortcuts.help();
        return build_div('<h4>Command Mode (press <kbd>Esc</kbd> to enable)</h4>', command_shortcuts);
    };

    
    QuickHelp.prototype.build_edit_help = function (cm_shortcuts) {
        var edit_shortcuts = this.keyboard_manager.edit_shortcuts.help();
        jQuery.merge(cm_shortcuts, edit_shortcuts);
        return build_div('<h4>Edit Mode (press <kbd>Enter</kbd> to enable)</h4>', cm_shortcuts);
    };

    var build_one = function (s) {
        var help = s.help;
        var shortcut = '';
        if(s.shortcut){
            shortcut = humanize_sequence(s.shortcut);
        }
        return $('<div>').addClass('quickhelp').
            append($('<span/>').addClass('shortcut_key').append($(shortcut))).
            append($('<span/>').addClass('shortcut_descr').text(' : ' + help));

    };

    var build_div = function (title, shortcuts) {
        var i, half, n;
        var div = $('<div/>').append($(title));
        var sub_div = $('<div/>').addClass('container-fluid');
        var col1 = $('<div/>').addClass('col-md-6');
        var col2 = $('<div/>').addClass('col-md-6');
        n = shortcuts.length;
        half = ~~(n/2);  // Truncate :)
        for (i=0; i<half; i++) { col1.append( build_one(shortcuts[i]) ); }
        for (i=half; i<n; i++) { col2.append( build_one(shortcuts[i]) ); }
        sub_div.append(col1).append(col2);
        div.append(sub_div);
        return div;
    };

    module.exports = {'QuickHelp': QuickHelp,
      humanize_shortcut: humanize_shortcut,
      humanize_sequence: humanize_sequence
  };

},{"base/js/dialog":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/dialog.js","base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/savewidget.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var utils = require('base/js/utils');
    var dialog = require('base/js/dialog');
    var keyboard = require('base/js/keyboard');
    var moment = require('moment');

    var SaveWidget = function (selector, options) {
        /**
         * TODO: Remove circular ref.
         */
        this.notebook = undefined;
        this.selector = selector;
        this.events = options.events;
        this._checkpoint_date = undefined;
        this.keyboard_manager = options.keyboard_manager;
        if (this.selector !== undefined) {
            this.element = $(selector);
            this.bind_events();
        }
    };


    SaveWidget.prototype.bind_events = function () {
        var that = this;
        this.element.find('span.filename').click(function () {
            that.rename_notebook({notebook: that.notebook});
        });
        this.events.on('notebook_loaded.Notebook', function () {
            that.update_notebook_name();
            that.update_document_title();
        });
        this.events.on('notebook_saved.Notebook', function () {
            that.update_notebook_name();
            that.update_document_title();
        });
        this.events.on('notebook_renamed.Notebook', function () {
            that.update_notebook_name();
            that.update_document_title();
            that.update_address_bar();
        });
        this.events.on('notebook_save_failed.Notebook', function () {
            that.set_save_status('Autosave Failed!');
        });
        this.events.on('notebook_read_only.Notebook', function () {
            that.set_save_status('(read only)');
            // disable future set_save_status
            that.set_save_status = function () {};
        });
        this.events.on('checkpoints_listed.Notebook', function (event, data) {
            that._set_last_checkpoint(data[0]);
        });

        this.events.on('checkpoint_created.Notebook', function (event, data) {
            that._set_last_checkpoint(data);
        });
        this.events.on('set_dirty.Notebook', function (event, data) {
            that.set_autosaved(data.value);
        });
    };


    SaveWidget.prototype.rename_notebook = function (options) {
        options = options || {};
        var that = this;
        var dialog_body = $('<div/>').append(
            $("<p/>").addClass("rename-message")
                .text('Enter a new notebook name:')
        ).append(
            $("<br/>")
        ).append(
            $('<input/>').attr('type','text').attr('size','25').addClass('form-control')
            .val(options.notebook.get_notebook_name())
        );
        var d = dialog.modal({
            title: "Rename Notebook",
            body: dialog_body,
            notebook: options.notebook,
            keyboard_manager: this.keyboard_manager,
            buttons : {
                "OK": {
                    class: "btn-primary",
                    click: function () {
                        var new_name = d.find('input').val();
                        if (!options.notebook.test_notebook_name(new_name)) {
                            d.find('.rename-message').text(
                                "Invalid notebook name. Notebook names must "+
                                "have 1 or more characters and can contain any characters " +
                                "except :/\\. Please enter a new notebook name:"
                            );
                            return false;
                        } else {
                            d.find('.rename-message').text("Renaming...");
                            d.find('input[type="text"]').prop('disabled', true);
                            that.notebook.rename(new_name).then(
                                function () {
                                    d.modal('hide');
                                }, function (error) {
                                    d.find('.rename-message').text(error.message || 'Unknown error');
                                    d.find('input[type="text"]').prop('disabled', false).focus().select();
                                }
                            );
                            return false;
                        }
                    }
                },
                "Cancel": {}
                },
            open : function () {
                /**
                 * Upon ENTER, click the OK button.
                 */
                d.find('input[type="text"]').keydown(function (event) {
                    if (event.which === keyboard.keycodes.enter) {
                        d.find('.btn-primary').first().click();
                        return false;
                    }
                });
                d.find('input[type="text"]').focus().select();
            }
        });
    };


    SaveWidget.prototype.update_notebook_name = function () {
        var nbname = this.notebook.get_notebook_name();
        this.element.find('span.filename').text(nbname);
    };


    SaveWidget.prototype.update_document_title = function () {
        var nbname = this.notebook.get_notebook_name();
        document.title = nbname;
    };

    SaveWidget.prototype.update_address_bar = function(){
        var base_url = this.notebook.base_url;
        var path = this.notebook.notebook_path;
        var state = {path : path};
        window.history.replaceState(state, "", utils.url_join_encode(
            base_url,
            "notebooks",
            path)
        );
    };


    SaveWidget.prototype.set_save_status = function (msg) {
        this.element.find('span.autosave_status').text(msg);
    };

    SaveWidget.prototype._set_last_checkpoint = function (checkpoint) {
        if (checkpoint) {
            this._checkpoint_date = new Date(checkpoint.last_modified);
        } else {
            this._checkpoint_date = null;
        }
        this._render_checkpoint();
    };

    SaveWidget.prototype._render_checkpoint = function () {
        /** actually set the text in the element, from our _checkpoint value
        
        called directly, and periodically in timeouts.
        */
        this._schedule_render_checkpoint();
        var el = this.element.find('span.checkpoint_status');
        if (!this._checkpoint_date) {
            el.text('').attr('title', 'no checkpoint');
            return;
        }
        var chkd = moment(this._checkpoint_date);
        var long_date = chkd.format('llll');
        var human_date;
        var tdelta = Math.ceil(new Date() - this._checkpoint_date);
        if (tdelta < utils.time.milliseconds.d){
            // less than 24 hours old, use relative date
            human_date = chkd.fromNow();
        } else {
            // otherwise show calendar 
            // <Today | yesterday|...> at hh,mm,ss
            human_date = chkd.calendar();
        }
        el.text('Last Checkpoint: ' + human_date).attr('title', long_date);
    };


    SaveWidget.prototype._schedule_render_checkpoint = function () {
        /** schedule the next update to relative date
        
        periodically updated, so short values like 'a few seconds ago' don't get stale.
        */
        if (!this._checkpoint_date) {
            return;
        }
        if ((this._checkpoint_timeout)) {
            clearTimeout(this._checkpoint_timeout);
        }
        var dt = Math.ceil(new Date() - this._checkpoint_date);
        this._checkpoint_timeout = setTimeout(
            $.proxy(this._render_checkpoint, this),
            utils.time.timeout_from_dt(dt)
        );
    };

    SaveWidget.prototype.set_autosaved = function (dirty) {
        if (dirty) {
            this.set_save_status("(unsaved changes)");
        } else {
            this.set_save_status("(autosaved)");
        }
    };

    exports.SaveWidget = SaveWidget;

},{"base/js/dialog":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/dialog.js","base/js/keyboard":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/keyboard.js","base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js","moment":"/Users/jon/jupyter/notebook/node_modules/moment/moment.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/scrollmanager.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var ScrollManager = function(notebook, options) {
        /**
         * Public constructor.
         */
        this.notebook = notebook;
        this.element = $('#site');
        options = options || {};
        this.animation_speed = options.animation_speed || 250; //ms
    };

    ScrollManager.prototype.scroll = function (delta) {
        /**
         * Scroll the document.
         *
         * Parameters
         * ----------
         * delta: integer
         *  direction to scroll the document.  Positive is downwards. 
         *  Unit is one page length.
         */
        this.scroll_some(delta);
        return false;
    };

    ScrollManager.prototype.scroll_to = function(selector) {
        /**
         * Scroll to an element in the notebook.
         */
        this.element.animate({'scrollTop': $(selector).offset().top + this.element.scrollTop() - this.element.offset().top}, this.animation_speed);
    };

    ScrollManager.prototype.scroll_some = function(pages) {
        /**
         * Scroll up or down a given number of pages.
         *
         * Parameters
         * ----------
         * pages: integer
         *  number of pages to scroll the document, may be positive or negative.
         */
        this.element.animate({'scrollTop': this.element.scrollTop() + pages * this.element.height()}, this.animation_speed);
    };

    ScrollManager.prototype.get_first_visible_cell = function() {
        /**
         * Gets the index of the first visible cell in the document.
         *
         * First, attempt to be smart by guessing the index of the cell we are
         * scrolled to.  Then, walk from there up or down until the right cell 
         * is found.  To guess the index, get the top of the last cell, and
         * divide that by the number of cells to get an average cell height.  
         * Then divide the scroll height by the average cell height.
         */
        var cell_count = this.notebook.ncells();
        var first_cell_top = this.notebook.get_cell(0).element.offset().top;
        var last_cell_top = this.notebook.get_cell(cell_count-1).element.offset().top;
        var avg_cell_height = (last_cell_top - first_cell_top) / cell_count;
        var i = Math.ceil(this.element.scrollTop() / avg_cell_height);
        i = Math.min(Math.max(i , 0), cell_count - 1);

        while (this.notebook.get_cell(i).element.offset().top - first_cell_top < this.element.scrollTop() && i < cell_count - 1) {
            i += 1;
        } 

        while (this.notebook.get_cell(i).element.offset().top - first_cell_top > this.element.scrollTop() - 50 && i >= 0) {
            i -= 1;
        } 
        return Math.min(i + 1, cell_count - 1);
    };


    var TargetScrollManager = function(notebook, options) {
        /**
         * Public constructor.
         */
        ScrollManager.apply(this, [notebook, options]);
    };
    TargetScrollManager.prototype = Object.create(ScrollManager.prototype);

    TargetScrollManager.prototype.is_target = function (index) {
        /**
         * Check if a cell should be a scroll stop.
         *
         * Returns `true` if the cell is a cell that the scroll manager
         * should scroll to.  Otherwise, false is returned. 
         *
         * Parameters
         * ----------
         * index: integer
         *  index of the cell to test.
         */
        return false;
    };

    TargetScrollManager.prototype.scroll = function (delta) {
        /**
         * Scroll the document.
         *
         * Parameters
         * ----------
         * delta: integer
         *  direction to scroll the document.  Positive is downwards.
         *  Units are targets.
         *
         * Try to scroll to the next slide.
         */
        var cell_count = this.notebook.ncells();
        var selected_index = this.get_first_visible_cell() + delta;
        while (0 <= selected_index && selected_index < cell_count && !this.is_target(selected_index)) {
            selected_index += delta;
        }

        if (selected_index < 0 || cell_count <= selected_index) {
            return ScrollManager.prototype.scroll.apply(this, [delta]);
        } else {
            this.scroll_to(this.notebook.get_cell(selected_index).element);
            
            // Cancel browser keyboard scroll.
            return false;
        }
    };


    var SlideScrollManager = function(notebook, options) {
        /**
         * Public constructor.
         */
        TargetScrollManager.apply(this, [notebook, options]);
    };
    SlideScrollManager.prototype = Object.create(TargetScrollManager.prototype);

    SlideScrollManager.prototype.is_target = function (index) {
        var cell = this.notebook.get_cell(index);
        return cell.metadata && cell.metadata.slideshow && 
            cell.metadata.slideshow.slide_type && 
            (cell.metadata.slideshow.slide_type === "slide" ||
            cell.metadata.slideshow.slide_type === "subslide");
    };


    var HeadingScrollManager = function(notebook, options) {
        /**
         * Public constructor.
         */
        ScrollManager.apply(this, [notebook, options]);
        options = options || {};
        this._level = options.heading_level || 1;
    };
    HeadingScrollManager.prototype = Object.create(ScrollManager.prototype);

    HeadingScrollManager.prototype.scroll = function (delta) {
        /**
         * Scroll the document.
         *
         * Parameters
         * ----------
         * delta: integer
         *  direction to scroll the document.  Positive is downwards.
         *  Units are headers.
         *
         * Get all of the header elements that match the heading level or are of
         * greater magnitude (a smaller header number).
         */
        var headers = $();
        var i;
        for (i = 1; i <= this._level; i++) {
            headers = headers.add('#notebook-container h' + i);
        }

        // Find the header the user is on or below.
        var first_cell_top = this.notebook.get_cell(0).element.offset().top;
        var current_scroll = this.element.scrollTop();
        var header_scroll = 0;
        i = -1;
        while (current_scroll >= header_scroll && i < headers.length) {
            if (++i < headers.length) {
                header_scroll = $(headers[i]).offset().top - first_cell_top;
            }
        }
        i--;

        // Check if the user is below the header.
        if (i < 0 || current_scroll > $(headers[i]).offset().top - first_cell_top + 30) {
            // Below the header, count the header as a target.
            if (delta < 0) {
                delta += 1;
            }
        }
        i += delta;

        // Scroll!
        if (0 <= i && i < headers.length) {
            this.scroll_to(headers[i]);
            return false;
        } else {
            // Default to the base's scroll behavior when target header doesn't
            // exist.
            return ScrollManager.prototype.scroll.apply(this, [delta]);
        }
    };

    // Return naemspace for require.js loads
    module.exports = {
        'ScrollManager': ScrollManager,
        'SlideScrollManager': SlideScrollManager,
        'HeadingScrollManager': HeadingScrollManager,
        'TargetScrollManager': TargetScrollManager
    };

},{}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/textcell.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var utils = require('base/js/utils');
    var cell = require('notebook/js/cell');
    var security = require('base/js/security');
    var configmod = require('services/config');
    var mathjaxutils = require('notebook/js/mathjaxutils');
    var celltoolbar = require('notebook/js/celltoolbar');
    var marked = require('marked');

    var Cell = cell.Cell;

    var TextCell = function (options) {
        /**
         * Constructor
         *
         * Construct a new TextCell, codemirror mode is by default 'htmlmixed', 
         * and cell type is 'text' cell start as not redered.
         *
         * Parameters:
         *  options: dictionary
         *      Dictionary of keyword arguments.
         *          events: $(Events) instance 
         *          config: dictionary
         *          keyboard_manager: KeyboardManager instance 
         *          notebook: Notebook instance
         */
        options = options || {};

        // in all TextCell/Cell subclasses
        // do not assign most of members here, just pass it down
        // in the options dict potentially overwriting what you wish.
        // they will be assigned in the base class.
        this.notebook = options.notebook;
        this.events = options.events;
        this.config = options.config;
        
        // we cannot put this as a class key as it has handle to "this".
        var config = utils.mergeopt(TextCell, this.config);
        Cell.apply(this, [{
                    config: config, 
                    keyboard_manager: options.keyboard_manager, 
                    events: this.events}]);

        this.cell_type = this.cell_type || 'text';
        mathjaxutils = mathjaxutils;
        this.rendered = false;
    };

    TextCell.prototype = Object.create(Cell.prototype);

    TextCell.options_default = {
        cm_config : {
            extraKeys: {"Tab": "indentMore","Shift-Tab" : "indentLess"},
            mode: 'htmlmixed',
            lineWrapping : true,
        }
    };


    /**
     * Create the DOM element of the TextCell
     * @method create_element
     * @private
     */
    TextCell.prototype.create_element = function () {
        Cell.prototype.create_element.apply(this, arguments);
        var that = this;

        var cell = $("<div>").addClass('cell text_cell');
        cell.attr('tabindex','2');

        var prompt = $('<div/>').addClass('prompt input_prompt');
        cell.append(prompt);
        var inner_cell = $('<div/>').addClass('inner_cell');
        this.celltoolbar = new celltoolbar.CellToolbar({
            cell: this, 
            notebook: this.notebook});
        inner_cell.append(this.celltoolbar.element);
        var input_area = $('<div/>').addClass('input_area');
        this.code_mirror = new CodeMirror(input_area.get(0), this._options.cm_config);
        // In case of bugs that put the keyboard manager into an inconsistent state,
        // ensure KM is enabled when CodeMirror is focused:
        this.code_mirror.on('focus', function () {
            if (that.keyboard_manager) {
                that.keyboard_manager.enable();
            }
        });
        this.code_mirror.on('keydown', $.proxy(this.handle_keyevent,this))
        // The tabindex=-1 makes this div focusable.
        var render_area = $('<div/>').addClass('text_cell_render rendered_html')
            .attr('tabindex','-1');
        inner_cell.append(input_area).append(render_area);
        cell.append(inner_cell);
        this.element = cell;
    };


    // Cell level actions

    TextCell.prototype.select = function () {
        var cont = Cell.prototype.select.apply(this);
        if (cont) {
            if (this.mode === 'edit') {
                this.code_mirror.refresh();
            }
        }
        return cont;
    };

    TextCell.prototype.unrender = function () {
        var cont = Cell.prototype.unrender.apply(this);
        if (cont) {
            var text_cell = this.element;
            if (this.get_text() === this.placeholder) {
                this.set_text('');
            }
            this.refresh();
        }
        return cont;
    };

    TextCell.prototype.execute = function () {
        this.render();
    };

    /**
     * setter: {{#crossLink "TextCell/set_text"}}{{/crossLink}}
     * @method get_text
     * @retrun {string} CodeMirror current text value
     */
    TextCell.prototype.get_text = function() {
        return this.code_mirror.getValue();
    };

    /**
     * @param {string} text - Codemiror text value
     * @see TextCell#get_text
     * @method set_text
     * */
    TextCell.prototype.set_text = function(text) {
        this.code_mirror.setValue(text);
        this.unrender();
        this.code_mirror.refresh();
    };

    /**
     * setter :{{#crossLink "TextCell/set_rendered"}}{{/crossLink}}
     * @method get_rendered
     * */
    TextCell.prototype.get_rendered = function() {
        return this.element.find('div.text_cell_render').html();
    };

    /**
     * @method set_rendered
     */
    TextCell.prototype.set_rendered = function(text) {
        this.element.find('div.text_cell_render').html(text);
    };


    /**
     * Create Text cell from JSON
     * @param {json} data - JSON serialized text-cell
     * @method fromJSON
     */
    TextCell.prototype.fromJSON = function (data) {
        Cell.prototype.fromJSON.apply(this, arguments);
        if (data.cell_type === this.cell_type) {
            if (data.source !== undefined) {
                this.set_text(data.source);
                // make this value the starting point, so that we can only undo
                // to this state, instead of a blank cell
                this.code_mirror.clearHistory();
                // TODO: This HTML needs to be treated as potentially dangerous
                // user input and should be handled before set_rendered.         
                this.set_rendered(data.rendered || '');
                this.rendered = false;
                this.render();
            }
        }
    };

    /** Generate JSON from cell
     * @return {object} cell data serialised to json
     */
    TextCell.prototype.toJSON = function () {
        var data = Cell.prototype.toJSON.apply(this);
        data.source = this.get_text();
        if (data.source == this.placeholder) {
            data.source = "";
        }
        return data;
    };


    var MarkdownCell = function (options) {
        /**
         * Constructor
         *
         * Parameters:
         *  options: dictionary
         *      Dictionary of keyword arguments.
         *          events: $(Events) instance 
         *          config: ConfigSection instance
         *          keyboard_manager: KeyboardManager instance 
         *          notebook: Notebook instance
         */
        options = options || {};
        var config = utils.mergeopt(MarkdownCell, {});
        this.class_config = new configmod.ConfigWithDefaults(options.config,
                                            {}, 'MarkdownCell');
        TextCell.apply(this, [$.extend({}, options, {config: config})]);

        this.cell_type = 'markdown';
    };

    MarkdownCell.options_default = {
        cm_config: {
            mode: 'ipythongfm'
        },
        placeholder: "Type *Markdown* and LaTeX: $\\alpha^2$"
    };

    MarkdownCell.prototype = Object.create(TextCell.prototype);

    MarkdownCell.prototype.set_heading_level = function (level) {
        /**
         * make a markdown cell a heading
         */
        level = level || 1;
        var source = this.get_text();
        source = source.replace(/^(#*)\s?/,
            new Array(level + 1).join('#') + ' ');
        this.set_text(source);
        this.refresh();
        if (this.rendered) {
            this.render();
        }
    };

    /**
     * @method render
     */
    MarkdownCell.prototype.render = function () {
        var cont = TextCell.prototype.render.apply(this);
        if (cont) {
            var that = this;
            var text = this.get_text();
            var math = null;
            if (text === "") { text = this.placeholder; }
            var text_and_math = mathjaxutils.remove_math(text);
            text = text_and_math[0];
            math = text_and_math[1];
            marked(text, function (err, html) {
                html = mathjaxutils.replace_math(html, math);
                html = security.sanitize_html(html);
                html = $($.parseHTML(html));
                // add anchors to headings
                html.find(":header").addBack(":header").each(function (i, h) {
                    h = $(h);
                    var hash = h.text().replace(/ /g, '-');
                    h.attr('id', hash);
                    h.append(
                        $('<a/>')
                            .addClass('anchor-link')
                            .attr('href', '#' + hash)
                            .text('¶')
                    );
                });
                // links in markdown cells should open in new tabs
                html.find("a[href]").not('[href^="#"]').attr("target", "_blank");
                that.set_rendered(html);
                that.typeset();
                that.events.trigger("rendered.MarkdownCell", {cell: that});
            });
        }
        return cont;
    };


    var RawCell = function (options) {
        /**
         * Constructor
         *
         * Parameters:
         *  options: dictionary
         *      Dictionary of keyword arguments.
         *          events: $(Events) instance 
         *          config: ConfigSection instance
         *          keyboard_manager: KeyboardManager instance 
         *          notebook: Notebook instance
         */
        options = options || {};
        var config = utils.mergeopt(RawCell, {});
        TextCell.apply(this, [$.extend({}, options, {config: config})]);

        this.class_config = new configmod.ConfigWithDefaults(options.config,
                                            RawCell.config_defaults, 'RawCell');
        this.cell_type = 'raw';
    };

    RawCell.options_default = {
        placeholder : "Write raw LaTeX or other formats here, for use with nbconvert. " +
            "It will not be rendered in the notebook. " + 
            "When passing through nbconvert, a Raw Cell's content is added to the output unmodified."
    };

    RawCell.config_defaults =  {
        highlight_modes : {
            'diff'         :{'reg':[/^diff/]}
        },
    };

    RawCell.prototype = Object.create(TextCell.prototype);

    /** @method bind_events **/
    RawCell.prototype.bind_events = function () {
        TextCell.prototype.bind_events.apply(this);
        var that = this;
        this.element.focusout(function() {
            that.auto_highlight();
            that.render();
        });

        this.code_mirror.on('focus', function() { that.unrender(); });
    };

    /** @method render **/
    RawCell.prototype.render = function () {
        var cont = TextCell.prototype.render.apply(this);
        if (cont){
            var text = this.get_text();
            if (text === "") { text = this.placeholder; }
            this.set_text(text);
            this.element.removeClass('rendered');
            this.auto_highlight();
        }
        return cont;
    };

    module.exports = {
        TextCell: TextCell,
        MarkdownCell: MarkdownCell,
        RawCell: RawCell
    };

},{"base/js/security":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/security.js","base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js","marked":"/Users/jon/jupyter/notebook/node_modules/marked/lib/marked.js","notebook/js/cell":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/cell.js","notebook/js/celltoolbar":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/celltoolbar.js","notebook/js/mathjaxutils":"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/mathjaxutils.js","services/config":"/Users/jon/jupyter/notebook/notebook/static-src/services/config.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/toolbar.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

    "use strict";

    /**
     * A generic toolbar on which one can add button
     * @class ToolBar
     * @constructor
     * @param {Dom_object} selector
     */
    var ToolBar = function (selector, options) {
        this.selector = selector;
        this.actions = (options||{}).actions;
        if (this.selector !== undefined) {
            this.element = $(selector);
            this.style();
        }
    };

    ToolBar.prototype._pseudo_actions={};


    ToolBar.prototype.construct = function (config) {
        for(var k=0; k<config.length; k++) {
            this.add_buttons_group(config[k][0],config[k][1]);
        }
    };

    /**
     *  Add a group of button into the current toolbar.
     *
     *  Use a [dict of [list of action name]] to trigger
     *  on click to the button
     *
     *  @example
     *
     *      ... todo, maybe use a list of  list to keep ordering.
     *
     *      [
     *          [
     *            [
     *              action_name_1,
     *              action_name_2,
     *              action_name_3,
     *            ],
     *            optional_group_name
     *          ],
     *          ...
     *      ]
     *
     *  @param list {List}
     *      List of button of the group, with the following paramter for each :
     *      @param list.label {string} text to show on button hover
     *      @param list.icon {string} icon to choose from [Font Awesome](http://fortawesome.github.io/Font-Awesome)
     *      @param list.callback {function} function to be called on button click
     *      @param [list.id] {String} id to give to the button
     *  @param [group_id] {String} optionnal id to give to the group
     *
     *
     *  for private usage, the key can also be strings starting with '<' and ending with '>' to inject custom element that cannot
     *  be bound to an action.
     *
     */
    // TODO JUPYTER:
    // get rid of legacy code that handle things that are not actions.
    ToolBar.prototype.add_buttons_group = function (list, group_id) {
        // handle custom call of pseudoaction binding.
        if(typeof(list) === 'string' && list.slice(0,1) === '<' && list.slice(-1) === '>'){
            var _pseudo_action;
            try{
                _pseudo_action = list.slice(1,-1);
                this.element.append(this._pseudo_actions[_pseudo_action].call(this));
            } catch (e) {
                console.warn('ouch, calling ', _pseudo_action, 'does not seem to work...:', e);
            }
            return ;
        }
        var that = this;
        var btn_group = $('<div/>').addClass("btn-group");
        if( group_id !== undefined ) {
            btn_group.attr('id',group_id);
        }
        for(var i=0; i < list.length; i++) {

            // IIFE because javascript don't have loop scope so
            // action_name would otherwise be the same on all iteration
            // of the loop
            (function(i,list){
                var el = list[i];
                var action_name;
                var action;
                if(typeof(el) === 'string'){
                    action = that.actions.get(el);
                    action_name = el;

                }
                var button  = $('<button/>')
                    .addClass('btn btn-default')
                    .attr("title", el.label||action.help)
                    .append(
                        $("<i/>").addClass(el.icon||(action||{icon:'fa-exclamation-triangle'}).icon).addClass('fa')
                    );
                var id = el.id;
                if( id !== undefined ){
                    button.attr('id',id);
                }
                button.attr('data-jupyter-action', action_name);
                var fun = el.callback|| function(){
                    that.actions.call(action_name);
                };
                button.click(fun);
                btn_group.append(button);
            })(i,list);
            // END IIFE
        }
        $(this.selector).append(btn_group);
    };

    ToolBar.prototype.style = function () {
        this.element.addClass('toolbar');
    };

    /**
     * Show and hide toolbar
     * @method toggle
     */
    ToolBar.prototype.toggle = function () {
        this.element.toggle();
    };

    exports.ToolBar = ToolBar;

},{}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/tooltip.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var utils = require('base/js/utils');

    // tooltip constructor
    var Tooltip = function (events) {
        var that = this;
        this.events = events;
        this.time_before_tooltip = 1200;

        // handle to html
        this.tooltip = $('#tooltip');
        this._hidden = true;

        // variable for consecutive call
        this._old_cell = null;
        this._old_request = null;
        this._consecutive_counter = 0;

        // 'sticky ?'
        this._sticky = false;

        // display tooltip if the docstring is empty?
        this._hide_if_no_docstring = false;

        // contain the button in the upper right corner
        this.buttons = $('<div/>').addClass('tooltipbuttons');

        // will contain the docstring
        this.text = $('<div/>').addClass('tooltiptext').addClass('smalltooltip');

        // build the buttons menu on the upper right
        // expand the tooltip to see more
        var expandlink = $('<a/>').attr('href', "#").addClass("ui-corner-all") //rounded corner
        .attr('role', "button").attr('id', 'expanbutton').attr('title', 'Grow the tooltip vertically (press shift-tab twice)').click(function () {
            that.expand();
            event.preventDefault();
        }).append(
        $('<span/>').text('Expand').addClass('ui-icon').addClass('ui-icon-plus'));

        // open in pager
        var morelink = $('<a/>').attr('href', "#").attr('role', "button").addClass('ui-button').attr('title', 'show the current docstring in pager (press shift-tab 4 times)');
        var morespan = $('<span/>').text('Open in Pager').addClass('ui-icon').addClass('ui-icon-arrowstop-l-n');
        morelink.append(morespan);
        morelink.click(function () {
            that.showInPager(that._old_cell);
            event.preventDefault();
        });

        // close the tooltip
        var closelink = $('<a/>').attr('href', "#").attr('role', "button").addClass('ui-button');
        var closespan = $('<span/>').text('Close').addClass('ui-icon').addClass('ui-icon-close');
        closelink.append(closespan);
        closelink.click(function () {
            that.remove_and_cancel_tooltip(true);
            event.preventDefault();
        });

        this._clocklink = $('<a/>').attr('href', "#");
        this._clocklink.attr('role', "button");
        this._clocklink.addClass('ui-button');
        this._clocklink.attr('title', 'Tooltip will linger for 10 seconds while you type');
        var clockspan = $('<span/>').text('Close');
        clockspan.addClass('ui-icon');
        clockspan.addClass('ui-icon-clock');
        this._clocklink.append(clockspan);
        this._clocklink.click(function () {
            that.cancel_stick();
            event.preventDefault();
        });




        //construct the tooltip
        // add in the reverse order you want them to appear
        this.buttons.append(closelink);
        this.buttons.append(expandlink);
        this.buttons.append(morelink);
        this.buttons.append(this._clocklink);
        this._clocklink.hide();


        // we need a phony element to make the small arrow
        // of the tooltip in css
        // we will move the arrow later
        this.arrow = $('<div/>').addClass('pretooltiparrow');
        this.tooltip.append(this.buttons);
        this.tooltip.append(this.arrow);
        this.tooltip.append(this.text);

        // function that will be called if you press tab 1, 2, 3... times in a row
        this.tabs_functions = [function (cell, text, cursor) {
            that._request_tooltip(cell, text, cursor);
        }, function () {
            that.expand();
        }, function () {
            that.stick();
        }, function (cell) {
            that.cancel_stick();
            that.showInPager(cell);
        }];
        // call after all the tabs function above have bee call to clean their effects
        // if necessary
        this.reset_tabs_function = function (cell, text) {
            this._old_cell = (cell) ? cell : null;
            this._old_request = (text) ? text : null;
            this._consecutive_counter = 0;
        };
    };

    Tooltip.prototype.is_visible = function () {
        return !this._hidden;
    };

    Tooltip.prototype.showInPager = function (cell) {
        /**
         * reexecute last call in pager by appending ? to show back in pager
         */
        this.events.trigger('open_with_text.Pager', this._reply.content);
        this.remove_and_cancel_tooltip();
    };

    // grow the tooltip verticaly
    Tooltip.prototype.expand = function () {
        this.text.removeClass('smalltooltip');
        this.text.addClass('bigtooltip');
        $('#expanbutton').hide('slow');
    };

    // deal with all the logic of hiding the tooltip
    // and reset it's status
    Tooltip.prototype._hide = function () {
        this._hidden = true;
        this.tooltip.fadeOut('fast');
        $('#expanbutton').show('slow');
        this.text.removeClass('bigtooltip');
        this.text.addClass('smalltooltip');
        // keep scroll top to be sure to always see the first line
        this.text.scrollTop(0);
        this.code_mirror = null;
    };

    // return true on successfully removing a visible tooltip; otherwise return
    // false.
    Tooltip.prototype.remove_and_cancel_tooltip = function (force) {
        /**
         * note that we don't handle closing directly inside the calltip
         * as in the completer, because it is not focusable, so won't
         * get the event.
         */
        this.cancel_pending();
        if (!this._hidden) {
          if (force || !this._sticky) {
              this.cancel_stick();
              this._hide();
          }
          this.reset_tabs_function();
          return true;
        } else {
          return false;
        }
    };

    // cancel autocall done after '(' for example.
    Tooltip.prototype.cancel_pending = function () {
        if (this._tooltip_timeout !== null) {
            clearTimeout(this._tooltip_timeout);
            this._tooltip_timeout = null;
        }
    };

    // will trigger tooltip after timeout
    Tooltip.prototype.pending = function (cell, hide_if_no_docstring) {
        var that = this;
        this._tooltip_timeout = setTimeout(function () {
            that.request(cell, hide_if_no_docstring);
        }, that.time_before_tooltip);
    };

    // easy access for julia monkey patching.
    Tooltip.last_token_re = /[a-z_][0-9a-z._]*$/gi;

    Tooltip.prototype._request_tooltip = function (cell, text, cursor_pos) {
        var callbacks = $.proxy(this._show, this);
        var msg_id = cell.kernel.inspect(text, cursor_pos, callbacks);
    };

    // make an immediate completion request
    Tooltip.prototype.request = function (cell, hide_if_no_docstring) {
        /**
         * request(codecell)
         * Deal with extracting the text from the cell and counting
         * call in a row
         */
        this.cancel_pending();
        var editor = cell.code_mirror;
        var cursor = editor.getCursor();
        var cursor_pos = utils.to_absolute_cursor_pos(editor, cursor);
        var text = cell.get_text();

        this._hide_if_no_docstring = hide_if_no_docstring;

        if(editor.somethingSelected()){
            // get only the most recent selection.
            text = editor.getSelection();
        }

        // need a permanent handle to code_mirror for future auto recall
        this.code_mirror = editor;

        // now we treat the different number of keypress
        // first if same cell, same text, increment counter by 1
        if (this._old_cell == cell && this._old_request == text && this._hidden === false) {
            this._consecutive_counter++;
        } else {
            // else reset
            this.cancel_stick();
            this.reset_tabs_function (cell, text);
        }

        this.tabs_functions[this._consecutive_counter](cell, text, cursor_pos);

        // then if we are at the end of list function, reset
        if (this._consecutive_counter == this.tabs_functions.length) {
            this.reset_tabs_function (cell, text, cursor);
        }

        return;
    };

    // cancel the option of having the tooltip to stick
    Tooltip.prototype.cancel_stick = function () {
        clearTimeout(this._stick_timeout);
        this._stick_timeout = null;
        this._clocklink.hide('slow');
        this._sticky = false;
    };

    // put the tooltip in a sicky state for 10 seconds
    // it won't be removed by remove_and_cancell() unless you called with
    // the first parameter set to true.
    // remove_and_cancell_tooltip(true)
    Tooltip.prototype.stick = function (time) {
        time = (time !== undefined) ? time : 10;
        var that = this;
        this._sticky = true;
        this._clocklink.show('slow');
        this._stick_timeout = setTimeout(function () {
            that._sticky = false;
            that._clocklink.hide('slow');
        }, time * 1000);
    };

    // should be called with the kernel reply to actually show the tooltip
    Tooltip.prototype._show = function (reply) {
        /**
         * move the bubble if it is not hidden
         * otherwise fade it
         */
        this._reply = reply;
        var content = reply.content;
        if (!content.found) {
            // object not found, nothing to show
            return;
        }
        this.name = content.name;

        // do some math to have the tooltip arrow on more or less on left or right
        // position of the editor
        var cm_pos = $(this.code_mirror.getWrapperElement()).position();

        // anchor and head positions are local within CodeMirror element
        var anchor = this.code_mirror.cursorCoords(false, 'local');
        var head = this.code_mirror.cursorCoords(true, 'local');
        // locate the target at the center of anchor, head
        var center_left = (head.left + anchor.left) / 2;
        // locate the left edge of the tooltip, at most 450 px left of the arrow
        var edge_left = Math.max(center_left - 450, 0);
        // locate the arrow at the cursor. A 24 px offset seems necessary.
        var arrow_left = center_left - edge_left - 24;
        
        // locate left, top within container element
        var left = (cm_pos.left + edge_left) + 'px';
        var top = (cm_pos.top + head.bottom + 10) + 'px';

        if (this._hidden === false) {
            this.tooltip.animate({
                left: left,
                top: top
            });
        } else {
            this.tooltip.css({
                left: left
            });
            this.tooltip.css({
                top: top
            });
        }
        this.arrow.animate({
            'left': arrow_left + 'px'
        });
        
        this._hidden = false;
        this.tooltip.fadeIn('fast');
        this.text.children().remove();
        
        // This should support rich data types, but only text/plain for now
        // Any HTML within the docstring is escaped by the fixConsole() method.
        var pre = $('<pre/>').html(utils.fixConsole(content.data['text/plain']));
        this.text.append(pre);
        // keep scroll top to be sure to always see the first line
        this.text.scrollTop(0);
    };

    exports.Tooltip = Tooltip;

},{"base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/notebook/js/tour.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var tour_style = "<div class='popover tour'>\n" +
        "<div class='arrow'></div>\n" +
        "<div style='position:absolute; top:7px; right:7px'>\n" +
            "<button class='btn btn-default btn-sm fa fa-times' data-role='end'></button>\n" +
        "</div><h3 class='popover-title'></h3>\n" +
        "<div class='popover-content'></div>\n" +
        "<div class='popover-navigation'>\n" +
            "<button class='btn btn-default fa fa-step-backward' data-role='prev'></button>\n" +
            "<button class='btn btn-default fa fa-step-forward pull-right' data-role='next'></button>\n" +
            "<button id='tour-pause' class='btn btn-sm btn-default fa fa-pause' data-resume-text='' data-pause-text='' data-role='pause-resume'></button>\n" +
        "</div>\n" +
    "</div>";

    var NotebookTour = function (notebook, events) {
        var that = this;
        this.notebook = notebook;
        this.step_duration = 0;
        this.events = events;
        this.tour_steps = [
            { 
                title: "Welcome to the Notebook Tour",
                placement: 'bottom',
                orphan: true,
                content: "You can use the left and right arrow keys to go backwards and forwards."
            }, {
                element: "#notebook_name",
                title: "Filename",
                placement: 'bottom',
                content: "Click here to change the filename for this notebook."
            }, {
                element: $("#menus").parent(),
                placement: 'bottom',
                title: "Notebook Menubar",
                content: "The menubar has menus for actions on the notebook, its cells, and the kernel it communicates with."
            }, {
                element: "#maintoolbar",
                placement: 'bottom',
                title: "Notebook Toolbar",
                content: "The toolbar has buttons for the most common actions. Hover your mouse over each button for more information."
            }, {
                element: "#modal_indicator",
                title: "Mode Indicator",
                placement: 'bottom',
                content: "The Notebook has two modes: Edit Mode and Command Mode. In this area, an indicator can appear to tell you which mode you are in.",
                onShow: function(tour) { that.command_icon_hack(); }
            }, {
                element: "#modal_indicator",
                title: "Command Mode",
                placement: 'bottom',
                onShow: function(tour) { notebook.command_mode(); that.command_icon_hack(); },
                onNext: function(tour) { that.edit_mode(); },
                content: "Right now you are in Command Mode, and many keyboard shortcuts are available. In this mode, no icon is displayed in the indicator area."
            }, {
                element: "#modal_indicator",
                title: "Edit Mode",
                placement: 'bottom',
                onShow: function(tour) { that.edit_mode(); },
                content: "Pressing <code>Enter</code> or clicking in the input text area of the cell switches to Edit Mode."
            }, {
                element: '.selected',
                title: "Edit Mode",
                placement: 'bottom',
                onShow: function(tour) { that.edit_mode(); },
                content: "Notice that the border around the currently active cell changed color. Typing will insert text into the currently active cell."
            }, {
                element: '.selected',
                title: "Back to Command Mode",
                placement: 'bottom',
                onShow: function(tour) { notebook.command_mode(); },
                onHide: function(tour) { $('#help_menu').parent().children('a').click(); },
                content: "Pressing <code>Esc</code> or clicking outside of the input text area takes you back to Command Mode."
            }, {
                element: '#keyboard_shortcuts',
                title: "Keyboard Shortcuts",
                placement: 'bottom',
                onHide: function(tour) { $('#help_menu').parent().children('a').click(); },
                content: "You can click here to get a list of all of the keyboard shortcuts."
            }, {
                element: "#kernel_indicator_icon",
                title: "Kernel Indicator",
                placement: 'bottom',
                onShow: function(tour) { events.trigger('kernel_idle.Kernel');},
                content: "This is the Kernel indicator. It looks like this when the Kernel is idle."
            }, {
                element: "#kernel_indicator_icon",
                title: "Kernel Indicator",
                placement: 'bottom',
                onShow: function(tour) { events.trigger('kernel_busy.Kernel'); },
                content: "The Kernel indicator looks like this when the Kernel is busy."
            }, {
                element: ".fa-stop",
                placement: 'bottom',
                title: "Interrupting the Kernel",
                onHide: function(tour) { events.trigger('kernel_idle.Kernel'); },
                content: "To cancel a computation in progress, you can click here."
            }, {
                element: "#notification_kernel",
                placement: 'bottom',
                onShow: function(tour) { $('.fa-stop').click(); },
                title: "Notification Area",
                content: "Messages in response to user actions (Save, Interrupt, etc) appear here."
            }, {
                title: "Fin.",
                placement: 'bottom',
                orphan: true,
                content: "This concludes the Jupyter Notebook User Interface Tour. Happy hacking!"
            }
        ];

        requirejs(['bootstraptour'], function assignTour(Tour) {
            that.tour = new Tour({
                storage: false, // start tour from beginning every time
                debug: true,
                reflex: true, // click on element to continue tour
                animation: false,
                duration: that.step_duration,
                onStart: function() { console.log('tour started'); },
                // TODO: remove the onPause/onResume logic once pi's patch has been
                // merged upstream to make this work via data-resume-class and 
                // data-resume-text attributes.
                onPause: that.toggle_pause_play,
                onResume: that.toggle_pause_play,
                steps: that.tour_steps,
                template: tour_style,
                orphan: true
            });
        });
    };

    NotebookTour.prototype.start = function () {
        console.log("let's start the tour");
        this.tour.init();
        this.tour.start();
        if (this.tour.ended())
        {
            this.tour.restart();
        }
    };

    NotebookTour.prototype.command_icon_hack =  function() {
        $('#modal_indicator').css('min-height', 20);
    };

    NotebookTour.prototype.toggle_pause_play = function () { 
        $('#tour-pause').toggleClass('fa-pause fa-play'); 
    };

    NotebookTour.prototype.edit_mode = function() { 
        this.notebook.focus_cell(); 
        this.notebook.edit_mode();
    };

    exports.NotebookTour = NotebookTour;
    
},{}],"/Users/jon/jupyter/notebook/notebook/static-src/services/config.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var utils = require('base/js/utils');

    var ConfigSection = function(section_name, options) {
        this.section_name = section_name;
        this.base_url = options.base_url;
        this.data = {};
        
        var that = this;
        
        /* .loaded is a promise, fulfilled the first time the config is loaded
         * from the server. Code can do:
         *      conf.loaded.then(function() { ... using conf.data ... });
         */
        this._one_load_finished = false;
        this.loaded = new Promise(function(resolve, reject) {
            that._finish_firstload = resolve;
        });
    };

    ConfigSection.prototype.api_url = function() {
        return utils.url_join_encode(this.base_url, 'api/config', this.section_name);
    };

    ConfigSection.prototype._load_done = function() {
        if (!this._one_load_finished) {
            this._one_load_finished = true;
            this._finish_firstload();
        }
    };

    ConfigSection.prototype.load = function() {
        var that = this;
        return utils.promising_ajax(this.api_url(), {
            cache: false,
            type: "GET",
            dataType: "json",
        }).then(function(data) {
            that.data = data;
            that._load_done();
            return data;
        });
    };

    /**
     * Modify the config values stored. Update the local data immediately,
     * send the change to the server, and use the updated data from the server
     * when the reply comes.
     */
    ConfigSection.prototype.update = function(newdata) {
        $.extend(true, this.data, newdata);  // true -> recursive update
        
        var that = this;
        return utils.promising_ajax(this.api_url(), {
            processData: false,
            type : "PATCH",
            data: JSON.stringify(newdata),
            dataType : "json",
            contentType: 'application/json',
        }).then(function(data) {
            that.data = data;
            that._load_done();
            return data;
        });
    };


    var ConfigWithDefaults = function(section, defaults, classname) {
        this.section = section;
        this.defaults = defaults;
        this.classname = classname;
    };

    ConfigWithDefaults.prototype._class_data = function() {
        if (this.classname) {
            return this.section.data[this.classname] || {};
        } else {
            return this.section.data
        }
    };

    /**
     * Wait for config to have loaded, then get a value or the default.
     * Returns a promise.
     */
    ConfigWithDefaults.prototype.get = function(key) {
        var that = this;
        return this.section.loaded.then(function() {
            return this._class_data()[key] || this.defaults[key]
        });
    };

    /**
     * Return a config value. If config is not yet loaded, return the default
     * instead of waiting for it to load.
     */
    ConfigWithDefaults.prototype.get_sync = function(key) {
        return this._class_data()[key] || this.defaults[key];
    };

    /**
     * Set a config value. Send the update to the server, and change our
     * local copy of the data immediately.
     * Returns a promise which is fulfilled when the server replies to the
     * change.
     */
     ConfigWithDefaults.prototype.set = function(key, value) {
         var d = {};
         d[key] = value;
         if (this.classname) {
            var d2 = {};
            d2[this.classname] = d;
            return this.section.update(d2);
        } else {
            return this.section.update(d);
        }
    };

    module.exports = {
        ConfigSection: ConfigSection,
        ConfigWithDefaults: ConfigWithDefaults,
    };

},{"base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/services/kernels/comm.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

    "use strict";

    var utils = require('base/js/utils');

    //-----------------------------------------------------------------------
    // CommManager class
    //-----------------------------------------------------------------------

    var CommManager = function (kernel) {
        this.comms = {};
        this.targets = {};
        if (kernel !== undefined) {
            this.init_kernel(kernel);
        }
    };

    CommManager.prototype.init_kernel = function (kernel) {
        /**
         * connect the kernel, and register message handlers
         */
        this.kernel = kernel;
        var msg_types = ['comm_open', 'comm_msg', 'comm_close'];
        for (var i = 0; i < msg_types.length; i++) {
            var msg_type = msg_types[i];
            kernel.register_iopub_handler(msg_type, $.proxy(this[msg_type], this));
        }
    };

    CommManager.prototype.new_comm = function (target_name, data, callbacks, metadata, comm_id) {
        /**
         * Create a new Comm, register it, and open its Kernel-side counterpart
         * Mimics the auto-registration in `Comm.__init__` in the Jupyter Comm.
         *
         * argument comm_id is optional
         */
        var comm = new Comm(target_name, comm_id);
        this.register_comm(comm);
        comm.open(data, callbacks, metadata);
        return comm;
    };

    CommManager.prototype.register_target = function (target_name, f) {
        /**
         * Register a target function for a given target name
         */
        this.targets[target_name] = f;
    };

    CommManager.prototype.unregister_target = function (target_name, f) {
        /**
         * Unregister a target function for a given target name
         */
        delete this.targets[target_name];
    };

    CommManager.prototype.register_comm = function (comm) {
        /**
         * Register a comm in the mapping
         */
        this.comms[comm.comm_id] = Promise.resolve(comm);
        comm.kernel = this.kernel;
        return comm.comm_id;
    };

    CommManager.prototype.unregister_comm = function (comm) {
        /**
         * Remove a comm from the mapping
         */
        delete this.comms[comm.comm_id];
    };

    // comm message handlers

    CommManager.prototype.comm_open = function (msg) {
        var content = msg.content;
        var that = this;
        var comm_id = content.comm_id;

        this.comms[comm_id] = utils.load_class(content.target_name, content.target_module, 
            this.targets).then(function(target) {
                var comm = new Comm(content.target_name, comm_id);
                comm.kernel = that.kernel;
                try {
                    var response = target(comm, msg);
                } catch (e) {
                    comm.close();
                    that.unregister_comm(comm);
                    var wrapped_error = new utils.WrappedError("Exception opening new comm", e);
                    console.error(wrapped_error);
                    return Promise.reject(wrapped_error);
                }
                // Regardless of the target return value, we need to
                // then return the comm
                return Promise.resolve(response).then(function() {return comm;});
            }, utils.reject('Could not open comm', true));
        return this.comms[comm_id];
    };

    CommManager.prototype.comm_close = function(msg) {
        var content = msg.content;
        if (this.comms[content.comm_id] === undefined) {
            console.error('Comm promise not found for comm id ' + content.comm_id);
            return;
        }
        var that = this;
        this.comms[content.comm_id] = this.comms[content.comm_id].then(function(comm) {
            that.unregister_comm(comm);
            try {
                comm.handle_close(msg);
            } catch (e) {
                console.log("Exception closing comm: ", e, e.stack, msg);
            }
            // don't return a comm, so that further .then() functions
            // get an undefined comm input
        });
        return this.comms[content.comm_id];
    };

    CommManager.prototype.comm_msg = function(msg) {
        var content = msg.content;
        if (this.comms[content.comm_id] === undefined) {
            console.error('Comm promise not found for comm id ' + content.comm_id);
            return;
        }

        this.comms[content.comm_id] = this.comms[content.comm_id].then(function(comm) {
            try {
                comm.handle_msg(msg);
            } catch (e) {
                console.log("Exception handling comm msg: ", e, e.stack, msg);
            }
            return comm;
        });
        return this.comms[content.comm_id];
    };

    //-----------------------------------------------------------------------
    // Comm base class
    //-----------------------------------------------------------------------

    var Comm = function (target_name, comm_id) {
        this.target_name = target_name;
        this.comm_id = comm_id || utils.uuid();
        this._msg_callback = this._close_callback = null;
    };

    // methods for sending messages
    Comm.prototype.open = function (data, callbacks, metadata) {
        var content = {
            comm_id : this.comm_id,
            target_name : this.target_name,
            data : data || {},
        };
        return this.kernel.send_shell_message("comm_open", content, callbacks, metadata);
    };

    Comm.prototype.send = function (data, callbacks, metadata, buffers) {
        var content = {
            comm_id : this.comm_id,
            data : data || {},
        };
        return this.kernel.send_shell_message("comm_msg", content, callbacks, metadata, buffers);
    };

    Comm.prototype.close = function (data, callbacks, metadata) {
        var content = {
            comm_id : this.comm_id,
            data : data || {},
        };
        return this.kernel.send_shell_message("comm_close", content, callbacks, metadata);
    };

    // methods for registering callbacks for incoming messages
    Comm.prototype._register_callback = function (key, callback) {
        this['_' + key + '_callback'] = callback;
    };

    Comm.prototype.on_msg = function (callback) {
        this._register_callback('msg', callback);
    };

    Comm.prototype.on_close = function (callback) {
        this._register_callback('close', callback);
    };

    // methods for handling incoming messages

    Comm.prototype._callback = function (key, msg) {
        var callback = this['_' + key + '_callback'];
        if (callback) {
            try {
                callback(msg);
            } catch (e) {
                console.log("Exception in Comm callback", e, e.stack, msg);
            }
        }
    };

    Comm.prototype.handle_msg = function (msg) {
        this._callback('msg', msg);
    };

    Comm.prototype.handle_close = function (msg) {
        this._callback('close', msg);
    };

    module.exports = {
        'CommManager': CommManager,
        'Comm': Comm
    };

},{"base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/services/kernels/kernel.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var utils = require('base/js/utils');
    var comm = require('./comm');
    var serialize = require('./serialize');
    var events = require('base/js/events');

    /**
     * A Kernel class to communicate with the Python kernel. This
     * should generally not be constructed directly, but be created
     * by.  the `Session` object. Once created, this object should be
     * used to communicate with the kernel.
     * 
     * Preliminary documentation for the REST API is at
     * https://github.com/ipython/ipython/wiki/IPEP-16%3A-Notebook-multi-directory-dashboard-and-URL-mapping#kernels-api
     * 
     * @class Kernel
     * @param {string} kernel_service_url - the URL to access the kernel REST api
     * @param {string} ws_url - the websockets URL
     * @param {string} name - the kernel type (e.g. python3)
     */
    var Kernel = function (kernel_service_url, ws_url, name) {
        this.events = events;

        this.id = null;
        this.name = name;
        this.ws = null;

        this.kernel_service_url = kernel_service_url;
        this.kernel_url = null;
        this.ws_url = ws_url || utils.get_body_data("wsUrl");
        if (!this.ws_url) {
            // trailing 's' in https will become wss for secure web sockets
            this.ws_url = location.protocol.replace('http', 'ws') + "//" + location.host;
        }

        this.username = "username";
        this.session_id = utils.uuid();
        this._msg_callbacks = {};
        this._msg_queue = Promise.resolve();
        this.info_reply = {}; // kernel_info_reply stored here after starting

        if (typeof(WebSocket) !== 'undefined') {
            this.WebSocket = WebSocket;
        } else if (typeof(MozWebSocket) !== 'undefined') {
            this.WebSocket = MozWebSocket;
        } else {
            alert('Your browser does not have WebSocket support, please try Chrome, Safari or Firefox ≥ 6. Firefox 4 and 5 are also supported by you have to enable WebSockets in about:config.');
        }
        
        this.bind_events();
        this.init_iopub_handlers();
        this.comm_manager = new comm.CommManager(this);
        
        this.last_msg_id = null;
        this.last_msg_callbacks = {};

        this._autorestart_attempt = 0;
        this._reconnect_attempt = 0;
        this.reconnect_limit = 7;
    };

    /**
     * @function _get_msg
     */
    Kernel.prototype._get_msg = function (msg_type, content, metadata, buffers) {
        var msg = {
            header : {
                msg_id : utils.uuid(),
                username : this.username,
                session : this.session_id,
                msg_type : msg_type,
                version : "5.0"
            },
            metadata : metadata || {},
            content : content,
            buffers : buffers || [],
            parent_header : {}
        };
        return msg;
    };

    /**
     * @function bind_events
     */
    Kernel.prototype.bind_events = function () {
        var that = this;
        this.events.on('send_input_reply.Kernel', function(evt, data) { 
            that.send_input_reply(data);
        });

        var record_status = function (evt, info) {
            console.log('Kernel: ' + evt.type + ' (' + info.kernel.id + ')');
        };

        this.events.on('kernel_created.Kernel', record_status);
        this.events.on('kernel_reconnecting.Kernel', record_status);
        this.events.on('kernel_connected.Kernel', record_status);
        this.events.on('kernel_starting.Kernel', record_status);
        this.events.on('kernel_restarting.Kernel', record_status);
        this.events.on('kernel_autorestarting.Kernel', record_status);
        this.events.on('kernel_interrupting.Kernel', record_status);
        this.events.on('kernel_disconnected.Kernel', record_status);
        // these are commented out because they are triggered a lot, but can
        // be uncommented for debugging purposes
        //this.events.on('kernel_idle.Kernel', record_status);
        //this.events.on('kernel_busy.Kernel', record_status);
        this.events.on('kernel_ready.Kernel', record_status);
        this.events.on('kernel_killed.Kernel', record_status);
        this.events.on('kernel_dead.Kernel', record_status);

        this.events.on('kernel_ready.Kernel', function () {
            that._autorestart_attempt = 0;
        });
        this.events.on('kernel_connected.Kernel', function () {
            that._reconnect_attempt = 0;
        });
    };

    /**
     * Initialize the iopub handlers.
     *
     * @function init_iopub_handlers
     */
    Kernel.prototype.init_iopub_handlers = function () {
        var output_msg_types = ['stream', 'display_data', 'execute_result', 'error'];
        this._iopub_handlers = {};
        this.register_iopub_handler('status', $.proxy(this._handle_status_message, this));
        this.register_iopub_handler('clear_output', $.proxy(this._handle_clear_output, this));
        this.register_iopub_handler('execute_input', $.proxy(this._handle_input_message, this));
        
        for (var i=0; i < output_msg_types.length; i++) {
            this.register_iopub_handler(output_msg_types[i], $.proxy(this._handle_output_message, this));
        }
    };

    /**
     * GET /api/kernels
     *
     * Get the list of running kernels.
     *
     * @function list
     * @param {function} [success] - function executed on ajax success
     * @param {function} [error] - functon executed on ajax error
     */
    Kernel.prototype.list = function (success, error) {
        $.ajax(this.kernel_service_url, {
            processData: false,
            cache: false,
            type: "GET",
            dataType: "json",
            success: success,
            error: this._on_error(error)
        });
    };

    /**
     * POST /api/kernels
     *
     * Start a new kernel.
     *
     * In general this shouldn't be used -- the kernel should be
     * started through the session API. If you use this function and
     * are also using the session API then your session and kernel
     * WILL be out of sync!
     *
     * @function start
     * @param {params} [Object] - parameters to include in the query string
     * @param {function} [success] - function executed on ajax success
     * @param {function} [error] - functon executed on ajax error
     */
    Kernel.prototype.start = function (params, success, error) {
        var url = this.kernel_service_url;
        var qs = $.param(params || {}); // query string for sage math stuff
        if (qs !== "") {
            url = url + "?" + qs;
        }

        this.events.trigger('kernel_starting.Kernel', {kernel: this});
        var that = this;
        var on_success = function (data, status, xhr) {
            that.events.trigger('kernel_created.Kernel', {kernel: that});
            that._kernel_created(data);
            if (success) {
                success(data, status, xhr);
            }
        };

        $.ajax(url, {
            processData: false,
            cache: false,
            type: "POST",
            data: JSON.stringify({name: this.name}),
            contentType: 'application/json',
            dataType: "json",
            success: this._on_success(on_success),
            error: this._on_error(error)
        });

        return url;
    };

    /**
     * GET /api/kernels/[:kernel_id]
     *
     * Get information about the kernel.
     *
     * @function get_info
     * @param {function} [success] - function executed on ajax success
     * @param {function} [error] - functon executed on ajax error
     */
    Kernel.prototype.get_info = function (success, error) {
        $.ajax(this.kernel_url, {
            processData: false,
            cache: false,
            type: "GET",
            dataType: "json",
            success: this._on_success(success),
            error: this._on_error(error)
        });
    };

    /**
     * DELETE /api/kernels/[:kernel_id]
     *
     * Shutdown the kernel.
     *
     * If you are also using sessions, then this function shoul NOT be
     * used. Instead, use Session.delete. Otherwise, the session and
     * kernel WILL be out of sync.
     *
     * @function kill
     * @param {function} [success] - function executed on ajax success
     * @param {function} [error] - functon executed on ajax error
     */
    Kernel.prototype.kill = function (success, error) {
        this.events.trigger('kernel_killed.Kernel', {kernel: this});
        this._kernel_dead();
        $.ajax(this.kernel_url, {
            processData: false,
            cache: false,
            type: "DELETE",
            dataType: "json",
            success: this._on_success(success),
            error: this._on_error(error)
        });
    };

    /**
     * POST /api/kernels/[:kernel_id]/interrupt
     *
     * Interrupt the kernel.
     *
     * @function interrupt
     * @param {function} [success] - function executed on ajax success
     * @param {function} [error] - functon executed on ajax error
     */
    Kernel.prototype.interrupt = function (success, error) {
        this.events.trigger('kernel_interrupting.Kernel', {kernel: this});

        var that = this;
        var on_success = function (data, status, xhr) {
            /**
             * get kernel info so we know what state the kernel is in
             */
            that.kernel_info();
            if (success) {
                success(data, status, xhr);
            }
        };

        var url = utils.url_join_encode(this.kernel_url, 'interrupt');
        $.ajax(url, {
            processData: false,
            cache: false,
            type: "POST",
            contentType: false,  // there's no data with this
            dataType: "json",
            success: this._on_success(on_success),
            error: this._on_error(error)
        });
    };

    Kernel.prototype.restart = function (success, error) {
        /**
         * POST /api/kernels/[:kernel_id]/restart
         *
         * Restart the kernel.
         *
         * @function interrupt
         * @param {function} [success] - function executed on ajax success
         * @param {function} [error] - functon executed on ajax error
         */
        this.events.trigger('kernel_restarting.Kernel', {kernel: this});
        this.stop_channels();

        var that = this;
        var on_success = function (data, status, xhr) {
            that.events.trigger('kernel_created.Kernel', {kernel: that});
            that._kernel_created(data);
            if (success) {
                success(data, status, xhr);
            }
        };

        var on_error = function (xhr, status, err) {
            that.events.trigger('kernel_dead.Kernel', {kernel: that});
            that._kernel_dead();
            if (error) {
                error(xhr, status, err);
            }
        };

        var url = utils.url_join_encode(this.kernel_url, 'restart');
        $.ajax(url, {
            processData: false,
            cache: false,
            type: "POST",
            contentType: false,  // there's no data with this
            dataType: "json",
            success: this._on_success(on_success),
            error: this._on_error(on_error)
        });
    };

    Kernel.prototype.reconnect = function () {
        /**
         * Reconnect to a disconnected kernel. This is not actually a
         * standard HTTP request, but useful function nonetheless for
         * reconnecting to the kernel if the connection is somehow lost.
         *
         * @function reconnect
         */
        if (this.is_connected()) {
            return;
        }
        this._reconnect_attempt = this._reconnect_attempt + 1;
        this.events.trigger('kernel_reconnecting.Kernel', {
            kernel: this,
            attempt: this._reconnect_attempt,
        });
        this.start_channels();
    };

    Kernel.prototype._on_success = function (success) {
        /**
         * Handle a successful AJAX request by updating the kernel id and
         * name from the response, and then optionally calling a provided
         * callback.
         *
         * @function _on_success
         * @param {function} success - callback
         */
        var that = this;
        return function (data, status, xhr) {
            if (data) {
                that.id = data.id;
                that.name = data.name;
            }
            that.kernel_url = utils.url_join_encode(that.kernel_service_url, that.id);
            if (success) {
                success(data, status, xhr);
            }
        };
    };

    Kernel.prototype._on_error = function (error) {
        /**
         * Handle a failed AJAX request by logging the error message, and
         * then optionally calling a provided callback.
         *
         * @function _on_error
         * @param {function} error - callback
         */
        return function (xhr, status, err) {
            utils.log_ajax_error(xhr, status, err);
            if (error) {
                error(xhr, status, err);
            }
        };
    };

    Kernel.prototype._kernel_created = function (data) {
        /**
         * Perform necessary tasks once the kernel has been started,
         * including actually connecting to the kernel.
         *
         * @function _kernel_created
         * @param {Object} data - information about the kernel including id
         */
        this.id = data.id;
        this.kernel_url = utils.url_join_encode(this.kernel_service_url, this.id);
        this.start_channels();
    };

    Kernel.prototype._kernel_connected = function () {
        /**
         * Perform necessary tasks once the connection to the kernel has
         * been established. This includes requesting information about
         * the kernel.
         *
         * @function _kernel_connected
         */
        this.events.trigger('kernel_connected.Kernel', {kernel: this});
        // get kernel info so we know what state the kernel is in
        var that = this;
        this.kernel_info(function (reply) {
            that.info_reply = reply.content;
            that.events.trigger('kernel_ready.Kernel', {kernel: that});
        });
    };

    Kernel.prototype._kernel_dead = function () {
        /**
         * Perform necessary tasks after the kernel has died. This closing
         * communication channels to the kernel if they are still somehow
         * open.
         *
         * @function _kernel_dead
         */
        this.stop_channels();
    };

    Kernel.prototype.start_channels = function () {
        /**
         * Start the websocket channels.
         * Will stop and restart them if they already exist.
         *
         * @function start_channels
         */
        var that = this;
        this.stop_channels();
        var ws_host_url = this.ws_url + this.kernel_url;

        console.log("Starting WebSockets:", ws_host_url);
        
        this.ws = new this.WebSocket([
                that.ws_url,
                utils.url_join_encode(that.kernel_url, 'channels'),
                "?session_id=" + that.session_id
            ].join('')
        );
        
        var already_called_onclose = false; // only alert once
        var ws_closed_early = function(evt){
            if (already_called_onclose){
                return;
            }
            already_called_onclose = true;
            if ( ! evt.wasClean ){
                // If the websocket was closed early, that could mean
                // that the kernel is actually dead. Try getting
                // information about the kernel from the API call --
                // if that fails, then assume the kernel is dead,
                // otherwise just follow the typical websocket closed
                // protocol.
                that.get_info(function () {
                    that._ws_closed(ws_host_url, false);
                }, function () {
                    that.events.trigger('kernel_dead.Kernel', {kernel: that});
                    that._kernel_dead();
                });
            }
        };
        var ws_closed_late = function(evt){
            if (already_called_onclose){
                return;
            }
            already_called_onclose = true;
            if ( ! evt.wasClean ){
                that._ws_closed(ws_host_url, false);
            }
        };
        var ws_error = function(evt){
            if (already_called_onclose){
                return;
            }
            already_called_onclose = true;
            that._ws_closed(ws_host_url, true);
        };

        this.ws.onopen = $.proxy(this._ws_opened, this);
        this.ws.onclose = ws_closed_early;
        this.ws.onerror = ws_error;
        // switch from early-close to late-close message after 1s
        setTimeout(function() {
            if (that.ws !== null) {
                that.ws.onclose = ws_closed_late;
            }
        }, 1000);
        this.ws.onmessage = $.proxy(this._handle_ws_message, this);
    };

    Kernel.prototype._ws_opened = function (evt) {
        /**
         * Handle a websocket entering the open state,
         * signaling that the kernel is connected when websocket is open.
         *
         * @function _ws_opened
         */
        if (this.is_connected()) {
            // all events ready, trigger started event.
            this._kernel_connected();
        }
    };

    Kernel.prototype._ws_closed = function(ws_url, error) {
        /**
         * Handle a websocket entering the closed state.  If the websocket
         * was not closed due to an error, try to reconnect to the kernel.
         *
         * @function _ws_closed
         * @param {string} ws_url - the websocket url
         * @param {bool} error - whether the connection was closed due to an error
         */
        this.stop_channels();

        this.events.trigger('kernel_disconnected.Kernel', {kernel: this});
        if (error) {
            console.log('WebSocket connection failed: ', ws_url);
            this.events.trigger('kernel_connection_failed.Kernel', {kernel: this, ws_url: ws_url, attempt: this._reconnect_attempt});
        }
        this._schedule_reconnect();
    };

    Kernel.prototype._schedule_reconnect = function () {
        /**
         * function to call when kernel connection is lost
         * schedules reconnect, or fires 'connection_dead' if reconnect limit is hit
         */
        if (this._reconnect_attempt < this.reconnect_limit) {
            var timeout = Math.pow(2, this._reconnect_attempt);
            console.log("Connection lost, reconnecting in " + timeout + " seconds.");
            setTimeout($.proxy(this.reconnect, this), 1e3 * timeout);
        } else {
            this.events.trigger('kernel_connection_dead.Kernel', {
                kernel: this,
                reconnect_attempt: this._reconnect_attempt,
            });
            console.log("Failed to reconnect, giving up.");
        }
    };

    Kernel.prototype.stop_channels = function () {
        /**
         * Close the websocket. After successful close, the value
         * in `this.ws` will be null.
         *
         * @function stop_channels
         */
        var that = this;
        var close = function () {
            if (that.ws && that.ws.readyState === WebSocket.CLOSED) {
                that.ws = null;
            }
        };
        if (this.ws !== null) {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.onclose = close;
                this.ws.close();
            } else {
                close();
            }
        }
    };

    Kernel.prototype.is_connected = function () {
        /**
         * Check whether there is a connection to the kernel. This
         * function only returns true if websocket has been
         * created and has a state of WebSocket.OPEN.
         *
         * @function is_connected
         * @returns {bool} - whether there is a connection
         */
        // if any channel is not ready, then we're not connected
        if (this.ws === null) {
            return false;
        }
        if (this.ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        return true;
    };

    Kernel.prototype.is_fully_disconnected = function () {
        /**
         * Check whether the connection to the kernel has been completely
         * severed. This function only returns true if all channel objects
         * are null.
         *
         * @function is_fully_disconnected
         * @returns {bool} - whether the kernel is fully disconnected
         */
        return (this.ws === null);
    };

    Kernel.prototype.send_shell_message = function (msg_type, content, callbacks, metadata, buffers) {
        /**
         * Send a message on the Kernel's shell channel
         *
         * @function send_shell_message
         */
        if (!this.is_connected()) {
            throw new Error("kernel is not connected");
        }
        var msg = this._get_msg(msg_type, content, metadata, buffers);
        msg.channel = 'shell';
        this.ws.send(serialize.serialize(msg));
        this.set_callbacks_for_msg(msg.header.msg_id, callbacks);
        return msg.header.msg_id;
    };

    Kernel.prototype.kernel_info = function (callback) {
        /**
         * Get kernel info
         *
         * @function kernel_info
         * @param callback {function}
         *
         * When calling this method, pass a callback function that expects one argument.
         * The callback will be passed the complete `kernel_info_reply` message documented
         * [here](http://ipython.org/ipython-doc/dev/development/messaging.html#kernel-info)
         */
        var callbacks;
        if (callback) {
            callbacks = { shell : { reply : callback } };
        }
        return this.send_shell_message("kernel_info_request", {}, callbacks);
    };

    Kernel.prototype.inspect = function (code, cursor_pos, callback) {
        /**
         * Get info on an object
         *
         * When calling this method, pass a callback function that expects one argument.
         * The callback will be passed the complete `inspect_reply` message documented
         * [here](http://ipython.org/ipython-doc/dev/development/messaging.html#object-information)
         *
         * @function inspect
         * @param code {string}
         * @param cursor_pos {integer}
         * @param callback {function}
         */
        var callbacks;
        if (callback) {
            callbacks = { shell : { reply : callback } };
        }
        
        var content = {
            code : code,
            cursor_pos : cursor_pos,
            detail_level : 0
        };
        return this.send_shell_message("inspect_request", content, callbacks);
    };

    Kernel.prototype.execute = function (code, callbacks, options) {
        /**
         * Execute given code into kernel, and pass result to callback.
         *
         * @async
         * @function execute
         * @param {string} code
         * @param [callbacks] {Object} With the following keys (all optional)
         *      @param callbacks.shell.reply {function}
         *      @param callbacks.shell.payload.[payload_name] {function}
         *      @param callbacks.iopub.output {function}
         *      @param callbacks.iopub.clear_output {function}
         *      @param callbacks.input {function}
         * @param {object} [options]
         *      @param [options.silent=false] {Boolean}
         *      @param [options.user_expressions=empty_dict] {Dict}
         *      @param [options.allow_stdin=false] {Boolean} true|false
         *
         * @example
         *
         * The options object should contain the options for the execute
         * call. Its default values are:
         *
         *      options = {
         *        silent : true,
         *        user_expressions : {},
         *        allow_stdin : false
         *      }
         *
         * When calling this method pass a callbacks structure of the
         * form:
         *
         *      callbacks = {
         *       shell : {
         *         reply : execute_reply_callback,
         *         payload : {
         *           set_next_input : set_next_input_callback,
         *         }
         *       },
         *       iopub : {
         *         output : output_callback,
         *         clear_output : clear_output_callback,
         *       },
         *       input : raw_input_callback
         *      }
         *
         * Each callback will be passed the entire message as a single
         * arugment.  Payload handlers will be passed the corresponding
         * payload and the execute_reply message.
         */
        var content = {
            code : code,
            silent : true,
            store_history : false,
            user_expressions : {},
            allow_stdin : false
        };
        callbacks = callbacks || {};
        if (callbacks.input !== undefined) {
            content.allow_stdin = true;
        }
        $.extend(true, content, options);
        this.events.trigger('execution_request.Kernel', {kernel: this, content: content});
        return this.send_shell_message("execute_request", content, callbacks);
    };

    /**
     * When calling this method, pass a function to be called with the
     * `complete_reply` message as its only argument when it arrives.
     *
     * `complete_reply` is documented
     * [here](http://ipython.org/ipython-doc/dev/development/messaging.html#complete)
     *
     * @function complete
     * @param code {string}
     * @param cursor_pos {integer}
     * @param callback {function}
     */
    Kernel.prototype.complete = function (code, cursor_pos, callback) {
        var callbacks;
        if (callback) {
            callbacks = { shell : { reply : callback } };
        }
        var content = {
            code : code,
            cursor_pos : cursor_pos
        };
        return this.send_shell_message("complete_request", content, callbacks);
    };

    /**
     * @function send_input_reply
     */
    Kernel.prototype.send_input_reply = function (input) {
        if (!this.is_connected()) {
            throw new Error("kernel is not connected");
        }
        var content = {
            value : input
        };
        this.events.trigger('input_reply.Kernel', {kernel: this, content: content});
        var msg = this._get_msg("input_reply", content);
        msg.channel = 'stdin';
        this.ws.send(serialize.serialize(msg));
        return msg.header.msg_id;
    };

    /**
     * @function register_iopub_handler
     */
    Kernel.prototype.register_iopub_handler = function (msg_type, callback) {
        this._iopub_handlers[msg_type] = callback;
    };

    /**
     * Get the iopub handler for a specific message type.
     *
     * @function get_iopub_handler
     */
    Kernel.prototype.get_iopub_handler = function (msg_type) {
        return this._iopub_handlers[msg_type];
    };

    /**
     * Get callbacks for a specific message.
     *
     * @function get_callbacks_for_msg
     */
    Kernel.prototype.get_callbacks_for_msg = function (msg_id) {
        if (msg_id == this.last_msg_id) {
            return this.last_msg_callbacks;
        } else {
            return this._msg_callbacks[msg_id];
        }
    };

    /**
     * Clear callbacks for a specific message.
     *
     * @function clear_callbacks_for_msg
     */
    Kernel.prototype.clear_callbacks_for_msg = function (msg_id) {
        if (this._msg_callbacks[msg_id] !== undefined ) {
            delete this._msg_callbacks[msg_id];
        }
    };

    /**
     * @function _finish_shell
     */
    Kernel.prototype._finish_shell = function (msg_id) {
        var callbacks = this._msg_callbacks[msg_id];
        if (callbacks !== undefined) {
            callbacks.shell_done = true;
            if (callbacks.iopub_done) {
                this.clear_callbacks_for_msg(msg_id);
            }
        }
    };

    /**
     * @function _finish_iopub
     */
    Kernel.prototype._finish_iopub = function (msg_id) {
        var callbacks = this._msg_callbacks[msg_id];
        if (callbacks !== undefined) {
            callbacks.iopub_done = true;
            if (callbacks.shell_done) {
                this.clear_callbacks_for_msg(msg_id);
            }
        }
    };

    /**
     * Set callbacks for a particular message.
     * Callbacks should be a struct of the following form:
     * shell : {
     * 
     * }
     *
     * @function set_callbacks_for_msg
     */
    Kernel.prototype.set_callbacks_for_msg = function (msg_id, callbacks) {
        this.last_msg_id = msg_id;
        if (callbacks) {
            // shallow-copy mapping, because we will modify it at the top level
            var cbcopy = this._msg_callbacks[msg_id] = this.last_msg_callbacks = {};
            cbcopy.shell = callbacks.shell;
            cbcopy.iopub = callbacks.iopub;
            cbcopy.input = callbacks.input;
            cbcopy.shell_done = (!callbacks.shell);
            cbcopy.iopub_done = (!callbacks.iopub);
        } else {
            this.last_msg_callbacks = {};
        }
    };

    Kernel.prototype._handle_ws_message = function (e) {
        var that = this;
        this._msg_queue = this._msg_queue.then(function() {
            return serialize.deserialize(e.data);
        }).then(function(msg) {return that._finish_ws_message(msg);})
        .catch(utils.reject("Couldn't process kernel message", true));
    };

    Kernel.prototype._finish_ws_message = function (msg) {
        switch (msg.channel) {
            case 'shell':
                return this._handle_shell_reply(msg);
                break;
            case 'iopub':
                return this._handle_iopub_message(msg);
                break;
            case 'stdin':
                return this._handle_input_request(msg);
                break;
            default:
                console.error("unrecognized message channel", msg.channel, msg);
        }
    };

    Kernel.prototype._handle_shell_reply = function (reply) {
        this.events.trigger('shell_reply.Kernel', {kernel: this, reply:reply});
        var that = this;
        var content = reply.content;
        var metadata = reply.metadata;
        var parent_id = reply.parent_header.msg_id;
        var callbacks = this.get_callbacks_for_msg(parent_id);
        var promise = Promise.resolve();
        if (!callbacks || !callbacks.shell) {
            return;
        }
        var shell_callbacks = callbacks.shell;
        
        // signal that shell callbacks are done
        this._finish_shell(parent_id);
        
        if (shell_callbacks.reply !== undefined) {
            promise = promise.then(function() {return shell_callbacks.reply(reply)});
        }
        if (content.payload && shell_callbacks.payload) {
            promise = promise.then(function() {
                return that._handle_payloads(content.payload, shell_callbacks.payload, reply);
            });
        }
        return promise;
    };

    /**
     * @function _handle_payloads
     */
    Kernel.prototype._handle_payloads = function (payloads, payload_callbacks, msg) {
        var promise = [];
        var l = payloads.length;
        // Payloads are handled by triggering events because we don't want the Kernel
        // to depend on the Notebook or Pager classes.
        for (var i=0; i<l; i++) {
            var payload = payloads[i];
            var callback = payload_callbacks[payload.source];
            if (callback) {
                promise.push(callback(payload, msg));
            }
        }
        return Promise.all(promise);
    };

    /**
     * @function _handle_status_message
     */
    Kernel.prototype._handle_status_message = function (msg) {
        var execution_state = msg.content.execution_state;
        var parent_id = msg.parent_header.msg_id;
        
        // dispatch status msg callbacks, if any
        var callbacks = this.get_callbacks_for_msg(parent_id);
        if (callbacks && callbacks.iopub && callbacks.iopub.status) {
            try {
                callbacks.iopub.status(msg);
            } catch (e) {
                console.log("Exception in status msg handler", e, e.stack);
            }
        }
        
        if (execution_state === 'busy') {
            this.events.trigger('kernel_busy.Kernel', {kernel: this});

        } else if (execution_state === 'idle') {
            // signal that iopub callbacks are (probably) done
            // async output may still arrive,
            // but only for the most recent request
            this._finish_iopub(parent_id);
            
            // trigger status_idle event
            this.events.trigger('kernel_idle.Kernel', {kernel: this});

        } else if (execution_state === 'starting') {
            this.events.trigger('kernel_starting.Kernel', {kernel: this});
            var that = this;
            this.kernel_info(function (reply) {
                that.info_reply = reply.content;
                that.events.trigger('kernel_ready.Kernel', {kernel: that});
            });

        } else if (execution_state === 'restarting') {
            // autorestarting is distinct from restarting,
            // in that it means the kernel died and the server is restarting it.
            // kernel_restarting sets the notification widget,
            // autorestart shows the more prominent dialog.
            this._autorestart_attempt = this._autorestart_attempt + 1;
            this.events.trigger('kernel_restarting.Kernel', {kernel: this});
            this.events.trigger('kernel_autorestarting.Kernel', {kernel: this, attempt: this._autorestart_attempt});

        } else if (execution_state === 'dead') {
            this.events.trigger('kernel_dead.Kernel', {kernel: this});
            this._kernel_dead();
        }
    };

    /**
     * Handle clear_output message
     *
     * @function _handle_clear_output
     */
    Kernel.prototype._handle_clear_output = function (msg) {
        var callbacks = this.get_callbacks_for_msg(msg.parent_header.msg_id);
        if (!callbacks || !callbacks.iopub) {
            return;
        }
        var callback = callbacks.iopub.clear_output;
        if (callback) {
            callback(msg);
        }
    };

    /**
     * handle an output message (execute_result, display_data, etc.)
     *
     * @function _handle_output_message
     */
    Kernel.prototype._handle_output_message = function (msg) {
        var callbacks = this.get_callbacks_for_msg(msg.parent_header.msg_id);
        if (!callbacks || !callbacks.iopub) {
            // The message came from another client. Let the UI decide what to
            // do with it.
            this.events.trigger('received_unsolicited_message.Kernel', msg);
            return;
        }
        var callback = callbacks.iopub.output;
        if (callback) {
            callback(msg);
        }
    };

    /**
     * Handle an input message (execute_input).
     *
     * @function _handle_input message
     */
    Kernel.prototype._handle_input_message = function (msg) {
        var callbacks = this.get_callbacks_for_msg(msg.parent_header.msg_id);
        if (!callbacks) {
            // The message came from another client. Let the UI decide what to
            // do with it.
            this.events.trigger('received_unsolicited_message.Kernel', msg);
        }
    };

    /**
     * Dispatch IOPub messages to respective handlers. Each message
     * type should have a handler.
     *
     * @function _handle_iopub_message
     */
    Kernel.prototype._handle_iopub_message = function (msg) {
        var handler = this.get_iopub_handler(msg.header.msg_type);
        if (handler !== undefined) {
            return handler(msg);
        }
    };

    /**
     * @function _handle_input_request
     */
    Kernel.prototype._handle_input_request = function (request) {
        var header = request.header;
        var content = request.content;
        var metadata = request.metadata;
        var msg_type = header.msg_type;
        if (msg_type !== 'input_request') {
            console.log("Invalid input request!", request);
            return;
        }
        var callbacks = this.get_callbacks_for_msg(request.parent_header.msg_id);
        if (callbacks) {
            if (callbacks.input) {
                callbacks.input(request);
            }
        }
    };

    exports.Kernel = Kernel;

},{"./comm":"/Users/jon/jupyter/notebook/notebook/static-src/services/kernels/comm.js","./serialize":"/Users/jon/jupyter/notebook/notebook/static-src/services/kernels/serialize.js","base/js/events":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/events.js","base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/services/kernels/serialize.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var _deserialize_array_buffer = function (buf) {
        var data = new DataView(buf);
        // read the header: 1 + nbufs 32b integers
        var nbufs = data.getUint32(0);
        var offsets = [];
        var i;
        for (i = 1; i <= nbufs; i++) {
            offsets.push(data.getUint32(i * 4));
        }
        var json_bytes = new Uint8Array(buf.slice(offsets[0], offsets[1]));
        var msg = JSON.parse(
            (new TextDecoder('utf8')).decode(json_bytes)
        );
        // the remaining chunks are stored as DataViews in msg.buffers
        msg.buffers = [];
        var start, stop;
        for (i = 1; i < nbufs; i++) {
            start = offsets[i];
            stop = offsets[i+1] || buf.byteLength;
            msg.buffers.push(new DataView(buf.slice(start, stop)));
        }
        return msg;
    };

    var _deserialize_binary = function(data) {
        /**
         * deserialize the binary message format
         * callback will be called with a message whose buffers attribute
         * will be an array of DataViews.
         */
        if (data instanceof Blob) {
            // data is Blob, have to deserialize from ArrayBuffer in reader callback
            var reader = new FileReader();
            var promise = new Promise(function(resolve, reject) {
                reader.onload = function () {
                    var msg = _deserialize_array_buffer(this.result);
                    resolve(msg);
                };
            });
            reader.readAsArrayBuffer(data);
            return promise;
        } else {
            // data is ArrayBuffer, can deserialize directly
            var msg = _deserialize_array_buffer(data);
            return msg;
        }
    };

    var deserialize = function (data) {
        /**
         * deserialize a message and return a promise for the unpacked message
         */
        if (typeof data === "string") {
            // text JSON message
            return Promise.resolve(JSON.parse(data));
        } else {
            // binary message
            return Promise.resolve(_deserialize_binary(data));
        }
    };

    var _serialize_binary = function (msg) {
        /**
         * implement the binary serialization protocol
         * serializes JSON message to ArrayBuffer
         */
        msg = _.clone(msg);
        var offsets = [];
        var buffers = [];
        var i;
        for (i = 0; i < msg.buffers.length; i++) {
            // msg.buffers elements could be either views or ArrayBuffers
            // buffers elements are ArrayBuffers
            var b = msg.buffers[i];
            buffers.push(b.buffer instanceof ArrayBuffer ? b.buffer : b);
        }
        delete msg.buffers;
        var json_utf8 = (new TextEncoder('utf8')).encode(JSON.stringify(msg));
        buffers.unshift(json_utf8);
        var nbufs = buffers.length;
        offsets.push(4 * (nbufs + 1));
        for (i = 0; i + 1 < buffers.length; i++) {
            offsets.push(offsets[offsets.length-1] + buffers[i].byteLength);
        }
        var msg_buf = new Uint8Array(
            offsets[offsets.length-1] + buffers[buffers.length-1].byteLength
        );
        // use DataView.setUint32 for network byte-order
        var view = new DataView(msg_buf.buffer);
        // write nbufs to first 4 bytes
        view.setUint32(0, nbufs);
        // write offsets to next 4 * nbufs bytes
        for (i = 0; i < offsets.length; i++) {
            view.setUint32(4 * (i+1), offsets[i]);
        }
        // write all the buffers at their respective offsets
        for (i = 0; i < buffers.length; i++) {
            msg_buf.set(new Uint8Array(buffers[i]), offsets[i]);
        }
        
        // return raw ArrayBuffer
        return msg_buf.buffer;
    };

    var serialize = function (msg) {
        if (msg.buffers && msg.buffers.length) {
            return _serialize_binary(msg);
        } else {
            return JSON.stringify(msg);
        }
    };

    module.exports = {
        deserialize : deserialize,
        serialize: serialize
    };

},{}],"/Users/jon/jupyter/notebook/notebook/static-src/services/sessions/session.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var utils = require('base/js/utils');
    var kernel = require('services/kernels/kernel');

    /**
     * Session object for accessing the session REST api. The session
     * should be used to start kernels and then shut them down -- for
     * all other operations, the kernel object should be used.
     *
     * Preliminary documentation for the REST API is at 
     * https://github.com/ipython/ipython/wiki/IPEP-16%3A-Notebook-multi-directory-dashboard-and-URL-mapping#sessions-api
     *
     * Options should include:
     *  - notebook_path: the path (not including name) to the notebook
     *  - kernel_name: the type of kernel (e.g. python3)
     *  - base_url: the root url of the notebook server
     *  - ws_url: the url to access websockets
     *  - notebook: Notebook object
     *
     * @class Session
     * @param {Object} options
     */
    var Session = function (options) {
        this.id = null;
        this.notebook_model = {
            path: options.notebook_path
        };
        this.kernel_model = {
            id: null,
            name: options.kernel_name
        };

        this.base_url = options.base_url;
        this.ws_url = options.ws_url;
        this.session_service_url = utils.url_join_encode(this.base_url, 'api/sessions');
        this.session_url = null;

        this.notebook = options.notebook;
        this.kernel = null;
        this.events = options.notebook.events;

        this.bind_events();
    };

    Session.prototype.bind_events = function () {
        var that = this;
        var record_status = function (evt, info) {
            console.log('Session: ' + evt.type + ' (' + info.session.id + ')');
        };

        this.events.on('kernel_created.Session', record_status);
        this.events.on('kernel_dead.Session', record_status);
        this.events.on('kernel_killed.Session', record_status);

        // if the kernel dies, then also remove the session
        this.events.on('kernel_dead.Kernel', function () {
            that.delete();
        });
    };


    // Public REST api functions

    /**
     * GET /api/sessions
     *
     * Get a list of the current sessions.
     *
     * @function list
     * @param {function} [success] - function executed on ajax success
     * @param {function} [error] - functon executed on ajax error
     */
    Session.prototype.list = function (success, error) {
        $.ajax(this.session_service_url, {
            processData: false,
            cache: false,
            type: "GET",
            dataType: "json",
            success: success,
            error: this._on_error(error)
        });
    };

    /**
     * POST /api/sessions
     *
     * Start a new session. This function can only executed once.
     *
     * @function start
     * @param {function} [success] - function executed on ajax success
     * @param {function} [error] - functon executed on ajax error
     */
    Session.prototype.start = function (success, error) {
        var that = this;
        var on_success = function (data, status, xhr) {
            if (that.kernel) {
                that.kernel.name = that.kernel_model.name;
            } else {
                var kernel_service_url = utils.url_path_join(that.base_url, "api/kernels");
                that.kernel = new kernel.Kernel(kernel_service_url, that.ws_url, that.kernel_model.name);
            }
            that.events.trigger('kernel_created.Session', {session: that, kernel: that.kernel});
            that.kernel._kernel_created(data.kernel);
            if (success) {
                success(data, status, xhr);
            }
        };
        var on_error = function (xhr, status, err) {
            that.events.trigger('kernel_dead.Session', {session: that, xhr: xhr, status: status, error: err});
            if (error) {
                error(xhr, status, err);
            }
        };

        $.ajax(this.session_service_url, {
            processData: false,
            cache: false,
            type: "POST",
            data: JSON.stringify(this._get_model()),
            contentType: 'application/json',
            dataType: "json",
            success: this._on_success(on_success),
            error: this._on_error(on_error)
        });
    };

    /**
     * GET /api/sessions/[:session_id]
     *
     * Get information about a session.
     *
     * @function get_info
     * @param {function} [success] - function executed on ajax success
     * @param {function} [error] - functon executed on ajax error
     */
    Session.prototype.get_info = function (success, error) {
        $.ajax(this.session_url, {
            processData: false,
            cache: false,
            type: "GET",
            dataType: "json",
            success: this._on_success(success),
            error: this._on_error(error)
        });
    };

    /**
     * PATCH /api/sessions/[:session_id]
     *
     * Rename or move a notebook. If the given name or path are
     * undefined, then they will not be changed.
     *
     * @function rename_notebook
     * @param {string} [path] - new notebook path
     * @param {function} [success] - function executed on ajax success
     * @param {function} [error] - functon executed on ajax error
     */
    Session.prototype.rename_notebook = function (path, success, error) {
        if (path !== undefined) {
            this.notebook_model.path = path;
        }

        $.ajax(this.session_url, {
            processData: false,
            cache: false,
            type: "PATCH",
            data: JSON.stringify(this._get_model()),
            contentType: 'application/json',
            dataType: "json",
            success: this._on_success(success),
            error: this._on_error(error)
        });
    };

    /**
     * DELETE /api/sessions/[:session_id]
     *
     * Kill the kernel and shutdown the session.
     *
     * @function delete
     * @param {function} [success] - function executed on ajax success
     * @param {function} [error] - functon executed on ajax error
     */
    Session.prototype.delete = function (success, error) {
        if (this.kernel) {
            this.events.trigger('kernel_killed.Session', {session: this, kernel: this.kernel});
            this.kernel._kernel_dead();
        }

        $.ajax(this.session_url, {
            processData: false,
            cache: false,
            type: "DELETE",
            dataType: "json",
            success: this._on_success(success),
            error: this._on_error(error)
        });
    };

    /**
     * Restart the session by deleting it and the starting it
     * fresh. If options are given, they can include any of the
     * following:
     *
     * - notebook_path - the path to the notebook
     * - kernel_name - the name (type) of the kernel
     *
     * @function restart
     * @param {Object} [options] - options for the new kernel
     * @param {function} [success] - function executed on ajax success
     * @param {function} [error] - functon executed on ajax error
     */
    Session.prototype.restart = function (options, success, error) {
        var that = this;
        var start = function () {
            if (options && options.notebook_path) {
                that.notebook_model.path = options.notebook_path;
            }
            if (options && options.kernel_name) {
                that.kernel_model.name = options.kernel_name;
            }
            that.kernel_model.id = null;
            that.start(success, error);
        };
        this.delete(start, start);
    };

    // Helper functions

    /**
     * Get the data model for the session, which includes the notebook path
     * and kernel (name and id).
     *
     * @function _get_model
     * @returns {Object} - the data model
     */
    Session.prototype._get_model = function () {
        return {
            notebook: this.notebook_model,
            kernel: this.kernel_model
        };
    };

    /**
     * Update the data model from the given JSON object, which should
     * have attributes of `id`, `notebook`, and/or `kernel`. If
     * provided, the notebook data must include name and path, and the
     * kernel data must include name and id.
     *
     * @function _update_model
     * @param {Object} data - updated data model
     */
    Session.prototype._update_model = function (data) {
        if (data && data.id) {
            this.id = data.id;
            this.session_url = utils.url_join_encode(this.session_service_url, this.id);
        }
        if (data && data.notebook) {
            this.notebook_model.path = data.notebook.path;
        }
        if (data && data.kernel) {
            this.kernel_model.name = data.kernel.name;
            this.kernel_model.id = data.kernel.id;
        }
    };

    /**
     * Handle a successful AJAX request by updating the session data
     * model with the response, and then optionally calling a provided
     * callback.
     *
     * @function _on_success
     * @param {function} success - callback
     */
    Session.prototype._on_success = function (success) {
        var that = this;
        return function (data, status, xhr) {
            that._update_model(data);
            if (success) {
                success(data, status, xhr);
            }
        };
    };

    /**
     * Handle a failed AJAX request by logging the error message, and
     * then optionally calling a provided callback.
     *
     * @function _on_error
     * @param {function} error - callback
     */
    Session.prototype._on_error = function (error) {
        return function (xhr, status, err) {
            utils.log_ajax_error(xhr, status, err);
            if (error) {
                error(xhr, status, err);
            }
        };
    };

    /**
     * Error type indicating that the session is already starting.
     */
    var SessionAlreadyStarting = function (message) {
        this.name = "SessionAlreadyStarting";
        this.message = (message || "");
    };

    SessionAlreadyStarting.prototype = Error.prototype;

    module.exports = {
        Session: Session,
        SessionAlreadyStarting: SessionAlreadyStarting
    };

},{"base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js","services/kernels/kernel":"/Users/jon/jupyter/notebook/notebook/static-src/services/kernels/kernel.js"}],"/Users/jon/jupyter/notebook/notebook/static-src/tree/js/sessionlist.js":[function(require,module,exports){
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
    "use strict";

    var utils = require('base/js/utils');

    var SesssionList = function (options) {
        /**
         * Constructor
         *
         * Parameters:
         *  options: dictionary
         *      Dictionary of keyword arguments.
         *          events: $(Events) instance
         *          base_url : string
         */
        this.events = options.events;
        this.sessions = {};
        this.base_url = options.base_url || utils.get_body_data("baseUrl");

        // Add collapse arrows.
        $('#running .panel-group .panel .panel-heading a').each(function(index, el) {
            var $link = $(el);
            var $icon = $('<i />')
                .addClass('fa fa-caret-down');
            $link.append($icon);
            $link.down = true;
            $link.click(function () {
                if ($link.down) {
                    $link.down = false;
                    // jQeury doesn't know how to animate rotations.  Abuse
                    // jQueries animate function by using an unused css attribute
                    // to do the animation (borderSpacing).
                    $icon.animate({ borderSpacing: 90 }, {
                        step: function(now,fx) {
                            $icon.css('transform','rotate(-' + now + 'deg)'); 
                        }
                    }, 250);
                } else {
                    $link.down = true;
                    // See comment above.
                    $icon.animate({ borderSpacing: 0 }, {
                        step: function(now,fx) {
                            $icon.css('transform','rotate(-' + now + 'deg)'); 
                        }
                    }, 250);
                }
            });
        });
    };

    SesssionList.prototype.load_sessions = function(){
        var that = this;
        var settings = {
            processData : false,
            cache : false,
            type : "GET",
            dataType : "json",
            success : $.proxy(that.sessions_loaded, this),
            error : utils.log_ajax_error,
        };
        var url = utils.url_join_encode(this.base_url, 'api/sessions');
        $.ajax(url, settings);
    };

    SesssionList.prototype.sessions_loaded = function(data){
        this.sessions = {};
        var len = data.length;
        var nb_path;
        for (var i=0; i<len; i++) {
            nb_path = data[i].notebook.path;
            this.sessions[nb_path] = data[i].id;
        }
        this.events.trigger('sessions_loaded.Dashboard', this.sessions);
    };

    exports.SesssionList = SesssionList;

},{"base/js/utils":"/Users/jon/jupyter/notebook/notebook/static-src/base/js/utils.js"}],"/Users/jon/jupyter/notebook/notebook/static/components/google-caja/html-css-sanitizer-minified.js":[function(require,module,exports){
var CSS_PROP_BIT_QUANTITY=1;var CSS_PROP_BIT_HASH_VALUE=2;var CSS_PROP_BIT_NEGATIVE_QUANTITY=4;var CSS_PROP_BIT_QSTRING=8;var CSS_PROP_BIT_URL=16;var CSS_PROP_BIT_UNRESERVED_WORD=64;var CSS_PROP_BIT_UNICODE_RANGE=128;var CSS_PROP_BIT_GLOBAL_NAME=512;var CSS_PROP_BIT_PROPERTY_NAME=1024;var cssSchema=function(){var L=[["aliceblue","antiquewhite","aqua","aquamarine","azure","beige","bisque","black","blanchedalmond","blue","blueviolet","brown","burlywood","cadetblue","chartreuse","chocolate","coral","cornflowerblue","cornsilk","crimson","cyan","darkblue","darkcyan","darkgoldenrod","darkgray","darkgreen","darkkhaki","darkmagenta","darkolivegreen","darkorange","darkorchid","darkred","darksalmon","darkseagreen","darkslateblue","darkslategray","darkturquoise","darkviolet","deeppink","deepskyblue","dimgray","dodgerblue","firebrick","floralwhite","forestgreen","fuchsia","gainsboro","ghostwhite","gold","goldenrod","gray","green","greenyellow","honeydew","hotpink","indianred","indigo","ivory","khaki","lavender","lavenderblush","lawngreen","lemonchiffon","lightblue","lightcoral","lightcyan","lightgoldenrodyellow","lightgreen","lightgrey","lightpink","lightsalmon","lightseagreen","lightskyblue","lightslategray","lightsteelblue","lightyellow","lime","limegreen","linen","magenta","maroon","mediumaquamarine","mediumblue","mediumorchid","mediumpurple","mediumseagreen","mediumslateblue","mediumspringgreen","mediumturquoise","mediumvioletred","midnightblue","mintcream","mistyrose","moccasin","navajowhite","navy","oldlace","olive","olivedrab","orange","orangered","orchid","palegoldenrod","palegreen","paleturquoise","palevioletred","papayawhip","peachpuff","peru","pink","plum","powderblue","purple","red","rosybrown","royalblue","saddlebrown","salmon","sandybrown","seagreen","seashell","sienna","silver","skyblue","slateblue","slategray","snow","springgreen","steelblue","tan","teal","thistle","tomato","transparent","turquoise","violet","wheat","white","whitesmoke","yellow","yellowgreen"],["all-scroll","col-resize","crosshair","default","e-resize","hand","help","move","n-resize","ne-resize","no-drop","not-allowed","nw-resize","pointer","progress","row-resize","s-resize","se-resize","sw-resize","text","vertical-text","w-resize","wait"],["armenian","decimal","decimal-leading-zero","disc","georgian","lower-alpha","lower-greek","lower-latin","lower-roman","square","upper-alpha","upper-latin","upper-roman"],["100","200","300","400","500","600","700","800","900","bold","bolder","lighter"],["block-level","inline-level","table-caption","table-cell","table-column","table-column-group","table-footer-group","table-header-group","table-row","table-row-group"],["condensed","expanded","extra-condensed","extra-expanded","narrower","semi-condensed","semi-expanded","ultra-condensed","ultra-expanded","wider"],["inherit","inline","inline-block","inline-box","inline-flex","inline-grid","inline-list-item","inline-stack","inline-table","run-in"],["behind","center-left","center-right","far-left","far-right","left-side","leftwards","right-side","rightwards"],["large","larger","small","smaller","x-large","x-small","xx-large","xx-small"],["dashed","dotted","double","groove","outset","ridge","solid"],["ease","ease-in","ease-in-out","ease-out","linear","step-end","step-start"],["at","closest-corner","closest-side","ellipse","farthest-corner","farthest-side"],["baseline","middle","sub","super","text-bottom","text-top"],["caption","icon","menu","message-box","small-caption","status-bar"],["fast","faster","slow","slower","x-fast","x-slow"],["above","below","higher","level","lower"],["cursive","fantasy","monospace","sans-serif","serif"],["loud","silent","soft","x-loud","x-soft"],["no-repeat","repeat-x","repeat-y","round","space"],["blink","line-through","overline","underline"],["block","flex","grid","table"],["high","low","x-high","x-low"],["nowrap","pre","pre-line","pre-wrap"],["absolute","relative","static"],["alternate","alternate-reverse","reverse"],["border-box","content-box","padding-box"],["capitalize","lowercase","uppercase"],["child","female","male"],["=","opacity"],["backwards","forwards"],["bidi-override","embed"],["bottom","top"],["break-all","keep-all"],["clip","ellipsis"],["contain","cover"],["continuous","digits"],["end","start"],["flat","preserve-3d"],["hide","show"],["horizontal","vertical"],["inside","outside"],["italic","oblique"],["left","right"],["ltr","rtl"],["no-content","no-display"],["paused","running"],["suppress","unrestricted"],["thick","thin"],[","],["/"],["all"],["always"],["auto"],["avoid"],["both"],["break-word"],["center"],["circle"],["code"],["collapse"],["contents"],["fixed"],["hidden"],["infinite"],["inset"],["invert"],["justify"],["list-item"],["local"],["medium"],["mix"],["none"],["normal"],["once"],["repeat"],["scroll"],["separate"],["small-caps"],["spell-out"],["to"],["visible"]];var schema={animation:{cssPropBits:517,cssLitGroup:[L[10],L[24],L[29],L[45],L[48],L[54],L[63],L[71],L[72]],cssFns:["cubic-bezier()","steps()"]},"animation-delay":{cssPropBits:5,cssLitGroup:[L[48]],cssFns:[]},"animation-direction":{cssPropBits:0,cssLitGroup:[L[24],L[48],L[72]],cssFns:[]},"animation-duration":"animation-delay","animation-fill-mode":{cssPropBits:0,cssLitGroup:[L[29],L[48],L[54],L[71]],cssFns:[]},"animation-iteration-count":{cssPropBits:5,cssLitGroup:[L[48],L[63]],cssFns:[]},"animation-name":{cssPropBits:512,cssLitGroup:[L[48],L[71]],cssFns:[]},"animation-play-state":{cssPropBits:0,cssLitGroup:[L[45],L[48]],cssFns:[]},"animation-timing-function":{cssPropBits:0,cssLitGroup:[L[10],L[48]],cssFns:["cubic-bezier()","steps()"]},appearance:{cssPropBits:0,cssLitGroup:[L[71]],cssFns:[]},azimuth:{cssPropBits:5,cssLitGroup:[L[7],L[42],L[56]],cssFns:[]},"backface-visibility":{cssPropBits:0,cssLitGroup:[L[59],L[62],L[80]],cssFns:[]},background:{cssPropBits:23,cssLitGroup:[L[0],L[18],L[25],L[31],L[34],L[42],L[48],L[49],L[52],L[56],L[61],L[68],L[71],L[74],L[75]],cssFns:["image()","linear-gradient()","radial-gradient()","repeating-linear-gradient()","repeating-radial-gradient()","rgb()","rgba()"]},"background-attachment":{cssPropBits:0,cssLitGroup:[L[48],L[61],L[68],L[75]],cssFns:[]},"background-color":{cssPropBits:2,cssLitGroup:[L[0]],cssFns:["rgb()","rgba()"]},"background-image":{cssPropBits:16,cssLitGroup:[L[48],L[71]],cssFns:["image()","linear-gradient()","radial-gradient()","repeating-linear-gradient()","repeating-radial-gradient()"]},"background-position":{cssPropBits:5,cssLitGroup:[L[31],L[42],L[48],L[56]],cssFns:[]},"background-repeat":{cssPropBits:0,cssLitGroup:[L[18],L[48],L[74]],cssFns:[]},"background-size":{cssPropBits:5,cssLitGroup:[L[34],L[48],L[52]],cssFns:[]},border:{cssPropBits:7,cssLitGroup:[L[0],L[9],L[47],L[62],L[64],L[69],L[71]],cssFns:["rgb()","rgba()"]},"border-bottom":"border","border-bottom-color":"background-color","border-bottom-left-radius":{cssPropBits:5,cssFns:[]},"border-bottom-right-radius":"border-bottom-left-radius","border-bottom-style":{cssPropBits:0,cssLitGroup:[L[9],L[62],L[64],L[71]],cssFns:[]},"border-bottom-width":{cssPropBits:5,cssLitGroup:[L[47],L[69]],cssFns:[]},"border-collapse":{cssPropBits:0,cssLitGroup:[L[59],L[76]],cssFns:[]},"border-color":"background-color","border-left":"border","border-left-color":"background-color","border-left-style":"border-bottom-style","border-left-width":"border-bottom-width","border-radius":{cssPropBits:5,cssLitGroup:[L[49]],cssFns:[]},"border-right":"border","border-right-color":"background-color","border-right-style":"border-bottom-style","border-right-width":"border-bottom-width","border-spacing":"border-bottom-left-radius","border-style":"border-bottom-style","border-top":"border","border-top-color":"background-color","border-top-left-radius":"border-bottom-left-radius","border-top-right-radius":"border-bottom-left-radius","border-top-style":"border-bottom-style","border-top-width":"border-bottom-width","border-width":"border-bottom-width",bottom:{cssPropBits:5,cssLitGroup:[L[52]],cssFns:[]},box:{cssPropBits:0,cssLitGroup:[L[60],L[71],L[72]],cssFns:[]},"box-shadow":{cssPropBits:7,cssLitGroup:[L[0],L[48],L[64],L[71]],cssFns:["rgb()","rgba()"]},"box-sizing":{cssPropBits:0,cssLitGroup:[L[25]],cssFns:[]},"caption-side":{cssPropBits:0,cssLitGroup:[L[31]],cssFns:[]},clear:{cssPropBits:0,cssLitGroup:[L[42],L[54],L[71]],cssFns:[]},clip:{cssPropBits:0,cssLitGroup:[L[52]],cssFns:["rect()"]},color:"background-color",content:{cssPropBits:8,cssLitGroup:[L[71],L[72]],cssFns:[]},cue:{cssPropBits:16,cssLitGroup:[L[71]],cssFns:[]},"cue-after":"cue","cue-before":"cue",cursor:{cssPropBits:16,cssLitGroup:[L[1],L[48],L[52]],cssFns:[]},direction:{cssPropBits:0,cssLitGroup:[L[43]],cssFns:[]},display:{cssPropBits:0,cssLitGroup:[L[4],L[6],L[20],L[52],L[67],L[71]],cssFns:[]},"display-extras":{cssPropBits:0,cssLitGroup:[L[67],L[71]],cssFns:[]},"display-inside":{cssPropBits:0,cssLitGroup:[L[20],L[52]],cssFns:[]},"display-outside":{cssPropBits:0,cssLitGroup:[L[4],L[71]],cssFns:[]},elevation:{cssPropBits:5,cssLitGroup:[L[15]],cssFns:[]},"empty-cells":{cssPropBits:0,cssLitGroup:[L[38]],cssFns:[]},filter:{cssPropBits:0,cssFns:["alpha()"]},"float":{cssPropBits:0,cssLitGroup:[L[42],L[71]],cssFns:[]},font:{cssPropBits:73,cssLitGroup:[L[3],L[8],L[13],L[16],L[41],L[48],L[49],L[69],L[72],L[77]],cssFns:[]},"font-family":{cssPropBits:72,cssLitGroup:[L[16],L[48]],cssFns:[]},"font-size":{cssPropBits:1,cssLitGroup:[L[8],L[69]],cssFns:[]},"font-stretch":{cssPropBits:0,cssLitGroup:[L[5],L[72]],cssFns:[]},"font-style":{cssPropBits:0,cssLitGroup:[L[41],L[72]],cssFns:[]},"font-variant":{cssPropBits:0,cssLitGroup:[L[72],L[77]],cssFns:[]},"font-weight":{cssPropBits:0,cssLitGroup:[L[3],L[72]],cssFns:[]},height:"bottom",left:"bottom","letter-spacing":{cssPropBits:5,cssLitGroup:[L[72]],cssFns:[]},"line-height":{cssPropBits:1,cssLitGroup:[L[72]],cssFns:[]},"list-style":{cssPropBits:16,cssLitGroup:[L[2],L[40],L[57],L[71]],cssFns:["image()","linear-gradient()","radial-gradient()","repeating-linear-gradient()","repeating-radial-gradient()"]},"list-style-image":{cssPropBits:16,cssLitGroup:[L[71]],cssFns:["image()","linear-gradient()","radial-gradient()","repeating-linear-gradient()","repeating-radial-gradient()"]},"list-style-position":{cssPropBits:0,cssLitGroup:[L[40]],cssFns:[]},"list-style-type":{cssPropBits:0,cssLitGroup:[L[2],L[57],L[71]],cssFns:[]},margin:"bottom","margin-bottom":"bottom","margin-left":"bottom","margin-right":"bottom","margin-top":"bottom","max-height":{cssPropBits:1,cssLitGroup:[L[52],L[71]],cssFns:[]},"max-width":"max-height","min-height":{cssPropBits:1,cssLitGroup:[L[52]],cssFns:[]},"min-width":"min-height",opacity:{cssPropBits:1,cssFns:[]},outline:{cssPropBits:7,cssLitGroup:[L[0],L[9],L[47],L[62],L[64],L[65],L[69],L[71]],cssFns:["rgb()","rgba()"]},"outline-color":{cssPropBits:2,cssLitGroup:[L[0],L[65]],cssFns:["rgb()","rgba()"]},"outline-style":"border-bottom-style","outline-width":"border-bottom-width",overflow:{cssPropBits:0,cssLitGroup:[L[52],L[62],L[75],L[80]],cssFns:[]},"overflow-wrap":{cssPropBits:0,cssLitGroup:[L[55],L[72]],cssFns:[]},"overflow-x":{cssPropBits:0,cssLitGroup:[L[44],L[52],L[62],L[75],L[80]],cssFns:[]},"overflow-y":"overflow-x",padding:"opacity","padding-bottom":"opacity","padding-left":"opacity","padding-right":"opacity","padding-top":"opacity","page-break-after":{cssPropBits:0,cssLitGroup:[L[42],L[51],L[52],L[53]],cssFns:[]},"page-break-before":"page-break-after","page-break-inside":{cssPropBits:0,cssLitGroup:[L[52],L[53]],cssFns:[]},pause:"border-bottom-left-radius","pause-after":"border-bottom-left-radius","pause-before":"border-bottom-left-radius",perspective:{cssPropBits:5,cssLitGroup:[L[71]],cssFns:[]},"perspective-origin":{cssPropBits:5,cssLitGroup:[L[31],L[42],L[56]],cssFns:[]},pitch:{cssPropBits:5,cssLitGroup:[L[21],L[69]],cssFns:[]},"pitch-range":"border-bottom-left-radius","play-during":{cssPropBits:16,cssLitGroup:[L[52],L[70],L[71],L[74]],cssFns:[]},position:{cssPropBits:0,cssLitGroup:[L[23]],cssFns:[]},quotes:{cssPropBits:8,cssLitGroup:[L[71]],cssFns:[]},resize:{cssPropBits:0,cssLitGroup:[L[39],L[54],L[71]],cssFns:[]},richness:"border-bottom-left-radius",right:"bottom",speak:{cssPropBits:0,cssLitGroup:[L[71],L[72],L[78]],cssFns:[]},"speak-header":{cssPropBits:0,cssLitGroup:[L[51],L[73]],cssFns:[]},"speak-numeral":{cssPropBits:0,cssLitGroup:[L[35]],cssFns:[]},"speak-punctuation":{cssPropBits:0,cssLitGroup:[L[58],L[71]],cssFns:[]},"speech-rate":{cssPropBits:5,cssLitGroup:[L[14],L[69]],cssFns:[]},stress:"border-bottom-left-radius","table-layout":{cssPropBits:0,cssLitGroup:[L[52],L[61]],cssFns:[]},"text-align":{cssPropBits:0,cssLitGroup:[L[42],L[56],L[66]],cssFns:[]},"text-decoration":{cssPropBits:0,cssLitGroup:[L[19],L[71]],cssFns:[]},"text-indent":"border-bottom-left-radius","text-overflow":{cssPropBits:8,cssLitGroup:[L[33]],cssFns:[]},"text-shadow":"box-shadow","text-transform":{cssPropBits:0,cssLitGroup:[L[26],L[71]],cssFns:[]},"text-wrap":{cssPropBits:0,cssLitGroup:[L[46],L[71],L[72]],cssFns:[]},top:"bottom",transform:{cssPropBits:0,cssLitGroup:[L[71]],cssFns:["matrix()","perspective()","rotate()","rotate3d()","rotatex()","rotatey()","rotatez()","scale()","scale3d()","scalex()","scaley()","scalez()","skew()","skewx()","skewy()","translate()","translate3d()","translatex()","translatey()","translatez()"]},"transform-origin":"perspective-origin","transform-style":{cssPropBits:0,cssLitGroup:[L[37]],cssFns:[]},transition:{cssPropBits:1029,cssLitGroup:[L[10],L[48],L[50],L[71]],cssFns:["cubic-bezier()","steps()"]},"transition-delay":"animation-delay","transition-duration":"animation-delay","transition-property":{cssPropBits:1024,cssLitGroup:[L[48],L[50]],cssFns:[]},"transition-timing-function":"animation-timing-function","unicode-bidi":{cssPropBits:0,cssLitGroup:[L[30],L[72]],cssFns:[]},"vertical-align":{cssPropBits:5,cssLitGroup:[L[12],L[31]],cssFns:[]},visibility:"backface-visibility","voice-family":{cssPropBits:8,cssLitGroup:[L[27],L[48]],cssFns:[]},volume:{cssPropBits:1,cssLitGroup:[L[17],L[69]],cssFns:[]},"white-space":{cssPropBits:0,cssLitGroup:[L[22],L[72]],cssFns:[]},width:"min-height","word-break":{cssPropBits:0,cssLitGroup:[L[32],L[72]],cssFns:[]},"word-spacing":"letter-spacing","word-wrap":"overflow-wrap","z-index":"bottom",zoom:"line-height","cubic-bezier()":"animation-delay","steps()":{cssPropBits:5,cssLitGroup:[L[36],L[48]],cssFns:[]},"image()":{cssPropBits:18,cssLitGroup:[L[0],L[48]],cssFns:["rgb()","rgba()"]},"linear-gradient()":{cssPropBits:7,cssLitGroup:[L[0],L[31],L[42],L[48],L[79]],cssFns:["rgb()","rgba()"]},"radial-gradient()":{cssPropBits:7,cssLitGroup:[L[0],L[11],L[31],L[42],L[48],L[56],L[57]],cssFns:["rgb()","rgba()"]},"repeating-linear-gradient()":"linear-gradient()","repeating-radial-gradient()":"radial-gradient()","rgb()":{cssPropBits:1,cssLitGroup:[L[48]],cssFns:[]},"rgba()":"rgb()","rect()":{cssPropBits:5,cssLitGroup:[L[48],L[52]],cssFns:[]},"alpha()":{cssPropBits:1,cssLitGroup:[L[28]],cssFns:[]},"matrix()":"animation-delay","perspective()":"border-bottom-left-radius","rotate()":"border-bottom-left-radius","rotate3d()":"animation-delay","rotatex()":"border-bottom-left-radius","rotatey()":"border-bottom-left-radius","rotatez()":"border-bottom-left-radius","scale()":"animation-delay","scale3d()":"animation-delay","scalex()":"border-bottom-left-radius","scaley()":"border-bottom-left-radius","scalez()":"border-bottom-left-radius","skew()":"animation-delay","skewx()":"border-bottom-left-radius","skewy()":"border-bottom-left-radius","translate()":"animation-delay","translate3d()":"animation-delay","translatex()":"border-bottom-left-radius","translatey()":"border-bottom-left-radius","translatez()":"border-bottom-left-radius"};if(true){for(var key in schema){if("string"===typeof schema[key]&&Object.hasOwnProperty.call(schema,key)){schema[key]=schema[schema[key]]}}}return schema}();if(typeof window!=="undefined"){window["cssSchema"]=cssSchema}var lexCss;var decodeCss;(function(){function decodeCssEscape(s){var i=parseInt(s.substring(1),16);if(i>65535){return i-=65536,String.fromCharCode(55296+(i>>10),56320+(i&1023))}else if(i==i){return String.fromCharCode(i)}else if(s[1]<" "){return""}else{return s[1]}}function escapeCssString(s,replacer){return'"'+s.replace(/[\u0000-\u001f\\\"<>]/g,replacer)+'"'}function escapeCssStrChar(ch){return cssStrChars[ch]||(cssStrChars[ch]="\\"+ch.charCodeAt(0).toString(16)+" ")}function escapeCssUrlChar(ch){return cssUrlChars[ch]||(cssUrlChars[ch]=(ch<""?"%0":"%")+ch.charCodeAt(0).toString(16))}var cssStrChars={"\\":"\\\\"};var cssUrlChars={"\\":"%5c"};var WC="[\\t\\n\\f ]";var W=WC+"*";var NL="[\\n\\f]";var SURROGATE_PAIR="[\\ud800-\\udbff][\\udc00-\\udfff]";var NONASCII="[\\u0080-\\ud7ff\\ue000-\\ufffd]|"+SURROGATE_PAIR;var UNICODE_TAIL="[0-9a-fA-F]{1,6}"+WC+"?";var UNICODE="\\\\"+UNICODE_TAIL;var ESCAPE_TAIL="(?:"+UNICODE_TAIL+"|[\\u0020-\\u007e\\u0080-\\ud7ff\\ue000\\ufffd]|"+SURROGATE_PAIR+")";var ESCAPE="\\\\"+ESCAPE_TAIL;var URLCHAR="(?:[\\t\\x21\\x23-\\x26\\x28-\\x5b\\x5d-\\x7e]|"+NONASCII+"|"+ESCAPE+")";var STRINGCHAR="[^'\"\\n\\f\\\\]|\\\\[\\s\\S]";var STRING="\"(?:'|"+STRINGCHAR+')*"'+"|'(?:\"|"+STRINGCHAR+")*'";var NUM="[-+]?(?:[0-9]+(?:[.][0-9]+)?|[.][0-9]+)";var NMSTART="(?:[a-zA-Z_]|"+NONASCII+"|"+ESCAPE+")";var NMCHAR="(?:[a-zA-Z0-9_-]|"+NONASCII+"|"+ESCAPE+")";var NAME=NMCHAR+"+";var IDENT="-?"+NMSTART+NMCHAR+"*";var ATKEYWORD="@"+IDENT;var HASH="#"+NAME;var NUMBER=NUM;var WORD_TERM="(?:@?-?"+NMSTART+"|#)"+NMCHAR+"*";var PERCENTAGE=NUM+"%";var DIMENSION=NUM+IDENT;var NUMERIC_VALUE=NUM+"(?:%|"+IDENT+")?";var URI="url[(]"+W+"(?:"+STRING+"|"+URLCHAR+"*)"+W+"[)]";var UNICODE_RANGE="U[+][0-9A-F?]{1,6}(?:-[0-9A-F]{1,6})?";var CDO="<!--";var CDC="-->";var S=WC+"+";var COMMENT="/(?:[*][^*]*[*]+(?:[^/][^*]*[*]+)*/|/[^\\n\\f]*)";var FUNCTION="(?!url[(])"+IDENT+"[(]";var INCLUDES="~=";var DASHMATCH="[|]=";var PREFIXMATCH="[^]=";var SUFFIXMATCH="[$]=";var SUBSTRINGMATCH="[*]=";var CMP_OPS="[~|^$*]=";var CHAR="[^\"'\\\\/]|/(?![/*])";var BOM="\\uFEFF";var CSS_TOKEN=new RegExp([BOM,UNICODE_RANGE,URI,FUNCTION,WORD_TERM,STRING,NUMERIC_VALUE,CDO,CDC,S,COMMENT,CMP_OPS,CHAR].join("|"),"gi");var CSS_DECODER=new RegExp("\\\\(?:"+ESCAPE_TAIL+"|"+NL+")","g");var URL_RE=new RegExp("^url\\("+W+"[\"']?|[\"']?"+W+"\\)$","gi");decodeCss=function(css){return css.replace(CSS_DECODER,decodeCssEscape)};lexCss=function(cssText){cssText=""+cssText;var tokens=cssText.replace(/\r\n?/g,"\n").match(CSS_TOKEN)||[];var j=0;var last=" ";for(var i=0,n=tokens.length;i<n;++i){var tok=decodeCss(tokens[i]);var len=tok.length;var cc=tok.charCodeAt(0);tok=cc=='"'.charCodeAt(0)||cc=="'".charCodeAt(0)?escapeCssString(tok.substring(1,len-1),escapeCssStrChar):cc=="/".charCodeAt(0)&&len>1||tok=="\\"||tok==CDC||tok==CDO||tok=="﻿"||cc<=" ".charCodeAt(0)?" ":/url\(/i.test(tok)?"url("+escapeCssString(tok.replace(URL_RE,""),escapeCssUrlChar)+")":tok;if(last!=tok||tok!=" "){tokens[j++]=last=tok}}tokens.length=j;return tokens}})();if(typeof window!=="undefined"){window["lexCss"]=lexCss;window["decodeCss"]=decodeCss}var URI=function(){function parse(uriStr){var m=(""+uriStr).match(URI_RE_);if(!m){return null}return new URI(nullIfAbsent(m[1]),nullIfAbsent(m[2]),nullIfAbsent(m[3]),nullIfAbsent(m[4]),nullIfAbsent(m[5]),nullIfAbsent(m[6]),nullIfAbsent(m[7]))}function create(scheme,credentials,domain,port,path,query,fragment){var uri=new URI(encodeIfExists2(scheme,URI_DISALLOWED_IN_SCHEME_OR_CREDENTIALS_),encodeIfExists2(credentials,URI_DISALLOWED_IN_SCHEME_OR_CREDENTIALS_),encodeIfExists(domain),port>0?port.toString():null,encodeIfExists2(path,URI_DISALLOWED_IN_PATH_),null,encodeIfExists(fragment));if(query){if("string"===typeof query){uri.setRawQuery(query.replace(/[^?&=0-9A-Za-z_\-~.%]/g,encodeOne))}else{uri.setAllParameters(query)}}return uri}function encodeIfExists(unescapedPart){if("string"==typeof unescapedPart){return encodeURIComponent(unescapedPart)}return null}function encodeIfExists2(unescapedPart,extra){if("string"==typeof unescapedPart){return encodeURI(unescapedPart).replace(extra,encodeOne)}return null}function encodeOne(ch){var n=ch.charCodeAt(0);return"%"+"0123456789ABCDEF".charAt(n>>4&15)+"0123456789ABCDEF".charAt(n&15)}function normPath(path){return path.replace(/(^|\/)\.(?:\/|$)/g,"$1").replace(/\/{2,}/g,"/")}var PARENT_DIRECTORY_HANDLER=new RegExp(""+"(/|^)"+"(?:[^./][^/]*|\\.{2,}(?:[^./][^/]*)|\\.{3,}[^/]*)"+"/\\.\\.(?:/|$)");var PARENT_DIRECTORY_HANDLER_RE=new RegExp(PARENT_DIRECTORY_HANDLER);var EXTRA_PARENT_PATHS_RE=/^(?:\.\.\/)*(?:\.\.$)?/;function collapse_dots(path){if(path===null){return null}var p=normPath(path);var r=PARENT_DIRECTORY_HANDLER_RE;for(var q;(q=p.replace(r,"$1"))!=p;p=q){}return p}function resolve(baseUri,relativeUri){var absoluteUri=baseUri.clone();var overridden=relativeUri.hasScheme();if(overridden){absoluteUri.setRawScheme(relativeUri.getRawScheme())}else{overridden=relativeUri.hasCredentials()}if(overridden){absoluteUri.setRawCredentials(relativeUri.getRawCredentials())}else{overridden=relativeUri.hasDomain()}if(overridden){absoluteUri.setRawDomain(relativeUri.getRawDomain())}else{overridden=relativeUri.hasPort()}var rawPath=relativeUri.getRawPath();var simplifiedPath=collapse_dots(rawPath);if(overridden){absoluteUri.setPort(relativeUri.getPort());simplifiedPath=simplifiedPath&&simplifiedPath.replace(EXTRA_PARENT_PATHS_RE,"")}else{overridden=!!rawPath;if(overridden){if(simplifiedPath.charCodeAt(0)!==47){var absRawPath=collapse_dots(absoluteUri.getRawPath()||"").replace(EXTRA_PARENT_PATHS_RE,"");var slash=absRawPath.lastIndexOf("/")+1;simplifiedPath=collapse_dots((slash?absRawPath.substring(0,slash):"")+collapse_dots(rawPath)).replace(EXTRA_PARENT_PATHS_RE,"")}}else{simplifiedPath=simplifiedPath&&simplifiedPath.replace(EXTRA_PARENT_PATHS_RE,"");if(simplifiedPath!==rawPath){absoluteUri.setRawPath(simplifiedPath)}}}if(overridden){absoluteUri.setRawPath(simplifiedPath)}else{overridden=relativeUri.hasQuery()}if(overridden){absoluteUri.setRawQuery(relativeUri.getRawQuery())}else{overridden=relativeUri.hasFragment()}if(overridden){absoluteUri.setRawFragment(relativeUri.getRawFragment())}return absoluteUri}function URI(rawScheme,rawCredentials,rawDomain,port,rawPath,rawQuery,rawFragment){this.scheme_=rawScheme;this.credentials_=rawCredentials;this.domain_=rawDomain;this.port_=port;this.path_=rawPath;this.query_=rawQuery;this.fragment_=rawFragment;this.paramCache_=null}URI.prototype.toString=function(){var out=[];if(null!==this.scheme_){out.push(this.scheme_,":")}if(null!==this.domain_){out.push("//");if(null!==this.credentials_){out.push(this.credentials_,"@")}out.push(this.domain_);if(null!==this.port_){out.push(":",this.port_.toString())}}if(null!==this.path_){out.push(this.path_)}if(null!==this.query_){out.push("?",this.query_)}if(null!==this.fragment_){out.push("#",this.fragment_)}return out.join("")};URI.prototype.clone=function(){return new URI(this.scheme_,this.credentials_,this.domain_,this.port_,this.path_,this.query_,this.fragment_)};URI.prototype.getScheme=function(){return this.scheme_&&decodeURIComponent(this.scheme_).toLowerCase()};URI.prototype.getRawScheme=function(){return this.scheme_};URI.prototype.setScheme=function(newScheme){this.scheme_=encodeIfExists2(newScheme,URI_DISALLOWED_IN_SCHEME_OR_CREDENTIALS_);return this};URI.prototype.setRawScheme=function(newScheme){this.scheme_=newScheme?newScheme:null;return this};URI.prototype.hasScheme=function(){return null!==this.scheme_};URI.prototype.getCredentials=function(){return this.credentials_&&decodeURIComponent(this.credentials_)};URI.prototype.getRawCredentials=function(){return this.credentials_};URI.prototype.setCredentials=function(newCredentials){this.credentials_=encodeIfExists2(newCredentials,URI_DISALLOWED_IN_SCHEME_OR_CREDENTIALS_);return this};URI.prototype.setRawCredentials=function(newCredentials){this.credentials_=newCredentials?newCredentials:null;return this};URI.prototype.hasCredentials=function(){return null!==this.credentials_};URI.prototype.getDomain=function(){return this.domain_&&decodeURIComponent(this.domain_)};URI.prototype.getRawDomain=function(){return this.domain_};URI.prototype.setDomain=function(newDomain){return this.setRawDomain(newDomain&&encodeURIComponent(newDomain))};URI.prototype.setRawDomain=function(newDomain){this.domain_=newDomain?newDomain:null;return this.setRawPath(this.path_)};URI.prototype.hasDomain=function(){return null!==this.domain_};URI.prototype.getPort=function(){return this.port_&&decodeURIComponent(this.port_)};URI.prototype.setPort=function(newPort){if(newPort){newPort=Number(newPort);if(newPort!==(newPort&65535)){throw new Error("Bad port number "+newPort)}this.port_=""+newPort}else{this.port_=null}return this};URI.prototype.hasPort=function(){return null!==this.port_};URI.prototype.getPath=function(){return this.path_&&decodeURIComponent(this.path_)};URI.prototype.getRawPath=function(){return this.path_};URI.prototype.setPath=function(newPath){return this.setRawPath(encodeIfExists2(newPath,URI_DISALLOWED_IN_PATH_))};URI.prototype.setRawPath=function(newPath){if(newPath){newPath=String(newPath);this.path_=!this.domain_||/^\//.test(newPath)?newPath:"/"+newPath}else{this.path_=null}return this};URI.prototype.hasPath=function(){return null!==this.path_};URI.prototype.getQuery=function(){return this.query_&&decodeURIComponent(this.query_).replace(/\+/g," ")};URI.prototype.getRawQuery=function(){return this.query_};URI.prototype.setQuery=function(newQuery){this.paramCache_=null;this.query_=encodeIfExists(newQuery);return this};URI.prototype.setRawQuery=function(newQuery){this.paramCache_=null;this.query_=newQuery?newQuery:null;return this};URI.prototype.hasQuery=function(){return null!==this.query_};URI.prototype.setAllParameters=function(params){if(typeof params==="object"){if(!(params instanceof Array)&&(params instanceof Object||Object.prototype.toString.call(params)!=="[object Array]")){var newParams=[];var i=-1;for(var k in params){var v=params[k];if("string"===typeof v){newParams[++i]=k;newParams[++i]=v}}params=newParams}}this.paramCache_=null;var queryBuf=[];var separator="";for(var j=0;j<params.length;){var k=params[j++];var v=params[j++];queryBuf.push(separator,encodeURIComponent(k.toString()));separator="&";if(v){queryBuf.push("=",encodeURIComponent(v.toString()))}}this.query_=queryBuf.join("");return this};URI.prototype.checkParameterCache_=function(){if(!this.paramCache_){var q=this.query_;if(!q){this.paramCache_=[]}else{var cgiParams=q.split(/[&\?]/);var out=[];var k=-1;for(var i=0;i<cgiParams.length;++i){var m=cgiParams[i].match(/^([^=]*)(?:=(.*))?$/);out[++k]=decodeURIComponent(m[1]).replace(/\+/g," ");out[++k]=decodeURIComponent(m[2]||"").replace(/\+/g," ")}this.paramCache_=out}}};URI.prototype.setParameterValues=function(key,values){if(typeof values==="string"){values=[values]}this.checkParameterCache_();var newValueIndex=0;var pc=this.paramCache_;var params=[];for(var i=0,k=0;i<pc.length;i+=2){if(key===pc[i]){if(newValueIndex<values.length){params.push(key,values[newValueIndex++])}}else{params.push(pc[i],pc[i+1])}}while(newValueIndex<values.length){params.push(key,values[newValueIndex++])}this.setAllParameters(params);return this};URI.prototype.removeParameter=function(key){return this.setParameterValues(key,[])};URI.prototype.getAllParameters=function(){this.checkParameterCache_();return this.paramCache_.slice(0,this.paramCache_.length)};URI.prototype.getParameterValues=function(paramNameUnescaped){this.checkParameterCache_();var values=[];for(var i=0;i<this.paramCache_.length;i+=2){if(paramNameUnescaped===this.paramCache_[i]){values.push(this.paramCache_[i+1])}}return values};URI.prototype.getParameterMap=function(paramNameUnescaped){this.checkParameterCache_();var paramMap={};for(var i=0;i<this.paramCache_.length;i+=2){var key=this.paramCache_[i++],value=this.paramCache_[i++];if(!(key in paramMap)){paramMap[key]=[value]}else{paramMap[key].push(value)}}return paramMap};URI.prototype.getParameterValue=function(paramNameUnescaped){this.checkParameterCache_();for(var i=0;i<this.paramCache_.length;i+=2){if(paramNameUnescaped===this.paramCache_[i]){return this.paramCache_[i+1]}}return null};URI.prototype.getFragment=function(){return this.fragment_&&decodeURIComponent(this.fragment_)};URI.prototype.getRawFragment=function(){return this.fragment_};URI.prototype.setFragment=function(newFragment){this.fragment_=newFragment?encodeURIComponent(newFragment):null;return this};URI.prototype.setRawFragment=function(newFragment){this.fragment_=newFragment?newFragment:null;return this};URI.prototype.hasFragment=function(){return null!==this.fragment_};function nullIfAbsent(matchPart){return"string"==typeof matchPart&&matchPart.length>0?matchPart:null}var URI_RE_=new RegExp("^"+"(?:"+"([^:/?#]+)"+":)?"+"(?://"+"(?:([^/?#]*)@)?"+"([^/?#:@]*)"+"(?::([0-9]+))?"+")?"+"([^?#]+)?"+"(?:\\?([^#]*))?"+"(?:#(.*))?"+"$");var URI_DISALLOWED_IN_SCHEME_OR_CREDENTIALS_=/[#\/\?@]/g;var URI_DISALLOWED_IN_PATH_=/[\#\?]/g;URI.parse=parse;URI.create=create;URI.resolve=resolve;URI.collapse_dots=collapse_dots;URI.utils={mimeTypeOf:function(uri){var uriObj=parse(uri);if(/\.html$/.test(uriObj.getPath())){return"text/html"}else{return"application/javascript"}},resolve:function(base,uri){if(base){return resolve(parse(base),parse(uri)).toString()}else{return""+uri}}};return URI}();if(typeof window!=="undefined"){window["URI"]=URI}var sanitizeCssProperty=undefined;var sanitizeCssSelectorList=undefined;var sanitizeStylesheet=undefined;var sanitizeStylesheetWithExternals=undefined;var sanitizeMediaQuery=undefined;(function(){var NOEFFECT_URL='url("about:blank")';var NORM_URL_REGEXP=/[\n\f\r\"\'()*<>]/g;var NORM_URL_REPLACEMENTS={"\n":"%0a","\f":"%0c","\r":"%0d",'"':"%22","'":"%27","(":"%28",")":"%29","*":"%2a","<":"%3c",">":"%3e"};function normalizeUrl(s){if("string"===typeof s){return'url("'+s.replace(NORM_URL_REGEXP,normalizeUrlChar)+'")'}else{return NOEFFECT_URL}}function normalizeUrlChar(ch){return NORM_URL_REPLACEMENTS[ch]}var URI_SCHEME_RE=new RegExp("^"+"(?:"+"([^:/?# ]+)"+":)?");var ALLOWED_URI_SCHEMES=/^(?:https?|mailto)$/i;function resolveUri(baseUri,uri){if(baseUri){return URI.utils.resolve(baseUri,uri)}return uri}function safeUri(uri,prop,naiveUriRewriter){if(!naiveUriRewriter){return null}var parsed=(""+uri).match(URI_SCHEME_RE);if(parsed&&(!parsed[1]||ALLOWED_URI_SCHEMES.test(parsed[1]))){return naiveUriRewriter(uri,prop)}else{return null}}function withoutVendorPrefix(ident){return ident.replace(/^-(?:apple|css|epub|khtml|moz|mso?|o|rim|wap|webkit|xv)-(?=[a-z])/,"")}sanitizeCssProperty=function(){function unionArrays(arrs){var map={};for(var i=arrs.length;--i>=0;){var arr=arrs[i];for(var j=arr.length;--j>=0;){map[arr[j]]=ALLOWED_LITERAL}}return map}var ALLOWED_LITERAL={};return function sanitize(property,tokens,opt_naiveUriRewriter,opt_baseUri,opt_idSuffix){var propertyKey=withoutVendorPrefix(property);var propertySchema=cssSchema[propertyKey];if(!propertySchema||"object"!==typeof propertySchema){tokens.length=0;return}var propBits=propertySchema["cssPropBits"];function sanitizeFunctionCall(tokens,start){var parenDepth=1,end=start+1,n=tokens.length;while(end<n&&parenDepth){var token=tokens[end++];parenDepth+=token===")"?-1:/^[^"']*\($/.test(token)}if(!parenDepth){var fnToken=tokens[start].toLowerCase();var bareFnToken=withoutVendorPrefix(fnToken);var fnTokens=tokens.splice(start,end-start,"");var fns=propertySchema["cssFns"];for(var i=0,nFns=fns.length;i<nFns;++i){if(fns[i].substring(0,bareFnToken.length)==bareFnToken){fnTokens[0]=fnTokens[fnTokens.length-1]="";sanitize(fns[i],fnTokens,opt_naiveUriRewriter,opt_baseUri);return fnToken+fnTokens.join(" ")+")"}}}return""}var stringDisposition=propBits&(CSS_PROP_BIT_URL|CSS_PROP_BIT_UNRESERVED_WORD);var identDisposition=propBits&(CSS_PROP_BIT_GLOBAL_NAME|CSS_PROP_BIT_PROPERTY_NAME);var lastQuoted=NaN;var i=0,k=0;for(;i<tokens.length;++i){var token=tokens[i].toLowerCase();var cc=token.charCodeAt(0),cc1,cc2,isnum1,isnum2,end;var litGroup,litMap;token=cc===" ".charCodeAt(0)?"":cc==='"'.charCodeAt(0)?stringDisposition===CSS_PROP_BIT_URL?opt_naiveUriRewriter?normalizeUrl(safeUri(resolveUri(opt_baseUri,decodeCss(tokens[i].substring(1,token.length-1))),propertyKey,opt_naiveUriRewriter)):"":propBits&CSS_PROP_BIT_QSTRING&&!(stringDisposition&stringDisposition-1)?token:"":token==="inherit"?token:(litGroup=propertySchema["cssLitGroup"],litMap=litGroup?propertySchema["cssLitMap"]||(propertySchema["cssLitMap"]=unionArrays(litGroup)):ALLOWED_LITERAL,litMap[withoutVendorPrefix(token)]===ALLOWED_LITERAL)?token:cc==="#".charCodeAt(0)&&/^#(?:[0-9a-f]{3}){1,2}$/.test(token)?propBits&CSS_PROP_BIT_HASH_VALUE?token:"":"0".charCodeAt(0)<=cc&&cc<="9".charCodeAt(0)?propBits&CSS_PROP_BIT_QUANTITY?token:"":(cc1=token.charCodeAt(1),cc2=token.charCodeAt(2),isnum1="0".charCodeAt(0)<=cc1&&cc1<="9".charCodeAt(0),isnum2="0".charCodeAt(0)<=cc2&&cc2<="9".charCodeAt(0),cc==="+".charCodeAt(0)&&(isnum1||cc1===".".charCodeAt(0)&&isnum2))?propBits&CSS_PROP_BIT_QUANTITY?(isnum1?"":"0")+token.substring(1):"":cc==="-".charCodeAt(0)&&(isnum1||cc1===".".charCodeAt(0)&&isnum2)?propBits&CSS_PROP_BIT_NEGATIVE_QUANTITY?(isnum1?"-":"-0")+token.substring(1):propBits&CSS_PROP_BIT_QUANTITY?"0":"":cc===".".charCodeAt(0)&&isnum1?propBits&CSS_PROP_BIT_QUANTITY?"0"+token:"":'url("'===token.substring(0,5)?opt_naiveUriRewriter&&propBits&CSS_PROP_BIT_URL?normalizeUrl(safeUri(resolveUri(opt_baseUri,tokens[i].substring(5,token.length-2)),propertyKey,opt_naiveUriRewriter)):"":token.charAt(token.length-1)==="("?sanitizeFunctionCall(tokens,i):identDisposition&&/^-?[a-z_][\w\-]*$/.test(token)&&!/__$/.test(token)?opt_idSuffix&&identDisposition===CSS_PROP_BIT_GLOBAL_NAME?tokens[i]+opt_idSuffix:identDisposition===CSS_PROP_BIT_PROPERTY_NAME&&cssSchema[token]&&"number"===typeof cssSchema[token].cssPropBits?token:"":/^\w+$/.test(token)&&stringDisposition===CSS_PROP_BIT_UNRESERVED_WORD&&propBits&CSS_PROP_BIT_QSTRING?lastQuoted+1===k?(tokens[lastQuoted]=tokens[lastQuoted].substring(0,tokens[lastQuoted].length-1)+" "+token+'"',token=""):(lastQuoted=k,'"'+token+'"'):"";
if(token){tokens[k++]=token}}if(k===1&&tokens[0]===NOEFFECT_URL){k=0}tokens.length=k}}();var PSEUDO_SELECTOR_WHITELIST=new RegExp("^(active|after|before|blank|checked|default|disabled"+"|drop|empty|enabled|first|first-child|first-letter"+"|first-line|first-of-type|fullscreen|focus|hover"+"|in-range|indeterminate|invalid|last-child|last-of-type"+"|left|link|only-child|only-of-type|optional|out-of-range"+"|placeholder-shown|read-only|read-write|required|right"+"|root|scope|user-error|valid|visited"+")$");var COMBINATOR={};COMBINATOR[">"]=COMBINATOR["+"]=COMBINATOR["~"]=COMBINATOR;sanitizeCssSelectorList=function(selectors,virtualization,opt_onUntranslatableSelector){var containerClass=virtualization.containerClass;var idSuffix=virtualization.idSuffix;var tagPolicy=virtualization.tagPolicy;var sanitized=[];var k=0,i,inBrackets=0,tok;for(i=0;i<selectors.length;++i){tok=selectors[i];if(tok=="("||tok=="["?(++inBrackets,true):tok==")"||tok=="]"?(inBrackets&&--inBrackets,true):!(selectors[i]==" "&&(inBrackets||COMBINATOR[selectors[i-1]]===COMBINATOR||COMBINATOR[selectors[i+1]]===COMBINATOR))){selectors[k++]=selectors[i]}}selectors.length=k;var n=selectors.length,start=0;for(i=0;i<n;++i){if(selectors[i]===","){if(!processComplexSelector(start,i)){return null}start=i+1}}if(!processComplexSelector(start,n)){return null}function processComplexSelector(start,end){if(selectors[start]===" "){++start}if(end-1!==start&&selectors[end]===" "){--end}var out=[];var lastOperator=start;var valid=true;for(var i=start;valid&&i<end;++i){var tok=selectors[i];if(COMBINATOR[tok]===COMBINATOR||tok===" "){if(!processCompoundSelector(lastOperator,i,tok)){valid=false}else{lastOperator=i+1}}}if(!processCompoundSelector(lastOperator,end,"")){valid=false}function processCompoundSelector(start,end,combinator){var element,classId,attrs,pseudoSelector,tok,valid=true;element="";if(start<end){tok=selectors[start];if(tok==="*"){++start;element=tok}else if(/^[a-zA-Z]/.test(tok)){var decision=tagPolicy(tok.toLowerCase(),[]);if(decision){if("tagName"in decision){tok=decision["tagName"]}++start;element=tok}}}classId="";attrs="";pseudoSelector="";for(;valid&&start<end;++start){tok=selectors[start];if(tok.charAt(0)==="#"){if(/^#_|__$|[^\w#:\-]/.test(tok)){valid=false}else{classId+=tok+idSuffix}}else if(tok==="."){if(++start<end&&/^[0-9A-Za-z:_\-]+$/.test(tok=selectors[start])&&!/^_|__$/.test(tok)){classId+="."+tok}else{valid=false}}else if(start+1<end&&selectors[start]==="["){++start;var vAttr=selectors[start++].toLowerCase();var atype=html4.ATTRIBS[element+"::"+vAttr];if(atype!==+atype){atype=html4.ATTRIBS["*::"+vAttr]}var rAttr;if(virtualization.virtualizeAttrName){rAttr=virtualization.virtualizeAttrName(element,vAttr);if(typeof rAttr!=="string"){valid=false;rAttr=vAttr}if(valid&&atype!==+atype){atype=html4.atype["NONE"]}}else{rAttr=vAttr;if(atype!==+atype){valid=false}}var op="",value="",ignoreCase=false;if(/^[~^$*|]?=$/.test(selectors[start])){op=selectors[start++];value=selectors[start++];if(/^[0-9A-Za-z:_\-]+$/.test(value)){value='"'+value+'"'}else if(value==="]"){value='""';--start}if(!/^"([^\"\\]|\\.)*"$/.test(value)){valid=false}ignoreCase=selectors[start]==="i";if(ignoreCase){++start}}if(selectors[start]!=="]"){++start;valid=false}switch(atype){case html4.atype["CLASSES"]:case html4.atype["LOCAL_NAME"]:case html4.atype["NONE"]:break;case html4.atype["GLOBAL_NAME"]:case html4.atype["ID"]:case html4.atype["IDREF"]:if((op==="="||op==="~="||op==="$=")&&value!='""'&&!ignoreCase){value='"'+value.substring(1,value.length-1)+idSuffix+'"'}else if(op==="|="||op===""){}else{valid=false}break;case html4.atype["URI"]:case html4.atype["URI_FRAGMENT"]:if(op!==""){valid=false}break;default:valid=false}if(valid){attrs+="["+rAttr.replace(/[^\w-]/g,"\\$&")+op+value+(ignoreCase?" i]":"]")}}else if(start<end&&selectors[start]===":"){tok=selectors[++start];if(PSEUDO_SELECTOR_WHITELIST.test(tok)){pseudoSelector+=":"+tok}else{break}}else{break}}if(start!==end){valid=false}if(valid){var selector=(element+classId).replace(/[^ .*#\w-]/g,"\\$&")+attrs+pseudoSelector+combinator;if(selector){out.push(selector)}}return valid}if(valid){if(out.length){var safeSelector=out.join("");if(containerClass!==null){safeSelector="."+containerClass+" "+safeSelector}sanitized.push(safeSelector)}return true}else{return!opt_onUntranslatableSelector||opt_onUntranslatableSelector(selectors.slice(start,end))}}return sanitized};(function(){var MEDIA_TYPE="(?:"+"all|aural|braille|embossed|handheld|print"+"|projection|screen|speech|tty|tv"+")";var MEDIA_FEATURE="(?:"+"(?:min-|max-)?"+"(?:"+("(?:device-)?"+"(?:aspect-ratio|height|width)"+"|color(?:-index)?"+"|monochrome"+"|orientation"+"|resolution")+")"+"|grid"+"|hover"+"|luminosity"+"|pointer"+"|scan"+"|script"+")";var LENGTH_UNIT="(?:p[cxt]|[cem]m|in|dpi|dppx|dpcm|%)";var CSS_VALUE="-?(?:"+"[a-z]\\w+(?:-\\w+)*"+"|\\d+(?: / \\d+|(?:\\.\\d+)?"+LENGTH_UNIT+"?)"+")";var MEDIA_EXPR="\\( "+MEDIA_FEATURE+" (?:"+": "+CSS_VALUE+" )?\\)";var MEDIA_QUERY="(?:"+"(?:(?:(?:only|not) )?"+MEDIA_TYPE+"|"+MEDIA_EXPR+")"+"(?: and ?"+MEDIA_EXPR+")*"+")";var STARTS_WITH_KEYWORD_REGEXP=/^\w/;var MEDIA_QUERY_LIST_REGEXP=new RegExp("^"+MEDIA_QUERY+"(?: , "+MEDIA_QUERY+")*"+"$","i");sanitizeMediaQuery=function(cssTokens){cssTokens=cssTokens.slice();var nTokens=cssTokens.length,k=0;for(var i=0;i<nTokens;++i){var tok=cssTokens[i];if(tok!=" "){cssTokens[k++]=tok}}cssTokens.length=k;var css=cssTokens.join(" ");css=!css.length?"":!MEDIA_QUERY_LIST_REGEXP.test(css)?"not all":STARTS_WITH_KEYWORD_REGEXP.test(css)?css:"not all , "+css;return css}})();(function(){function cssParseUri(candidate){var string1=/^\s*["]([^"]*)["]\s*$/;var string2=/^\s*[']([^']*)[']\s*$/;var url1=/^\s*url\s*[(]["]([^"]*)["][)]\s*$/;var url2=/^\s*url\s*[(][']([^']*)['][)]\s*$/;var url3=/^\s*url\s*[(]([^)]*)[)]\s*$/;var match;if(match=string1.exec(candidate)){return match[1]}else if(match=string2.exec(candidate)){return match[1]}else if(match=url1.exec(candidate)){return match[1]}else if(match=url2.exec(candidate)){return match[1]}else if(match=url3.exec(candidate)){return match[1]}return null}function sanitizeStylesheetInternal(baseUri,cssText,virtualization,naiveUriRewriter,naiveUriFetcher,continuation,opt_importCount){var safeCss=void 0;var importCount=opt_importCount||[0];var blockStack=[];var elide=false;parseCssStylesheet(cssText,{startStylesheet:function(){safeCss=[]},endStylesheet:function(){},startAtrule:function(atIdent,headerArray){if(elide){atIdent=null}else if(atIdent==="@media"){safeCss.push("@media"," ",sanitizeMediaQuery(headerArray))}else if(atIdent==="@keyframes"||atIdent==="@-webkit-keyframes"){var animationId=headerArray[0];if(headerArray.length===1&&!/__$|[^\w\-]/.test(animationId)){safeCss.push(atIdent," ",animationId+virtualization.idSuffix);atIdent="@keyframes"}else{atIdent=null}}else{if(atIdent==="@import"&&headerArray.length>0){atIdent=null;if("function"===typeof continuation){var mediaQuery=sanitizeMediaQuery(headerArray.slice(1));if(mediaQuery!=="not all"){++importCount[0];var placeholder=[];safeCss.push(placeholder);var cssUrl=safeUri(resolveUri(baseUri,cssParseUri(headerArray[0])),function(result){var sanitized=sanitizeStylesheetInternal(cssUrl,result.html,virtualization,naiveUriRewriter,naiveUriFetcher,continuation,importCount);--importCount[0];var safeImportedCss=mediaQuery?{toString:function(){return"@media "+mediaQuery+" {"+sanitized.result+"}"}}:sanitized.result;placeholder[0]=safeImportedCss;continuation(safeImportedCss,!!importCount[0])},naiveUriFetcher)}}else{if(window.console){window.console.log("@import "+headerArray.join(" ")+" elided")}}}}elide=!atIdent;blockStack.push(atIdent)},endAtrule:function(){blockStack.pop();if(!elide){safeCss.push(";")}checkElide()},startBlock:function(){if(!elide){safeCss.push("{")}},endBlock:function(){if(!elide){safeCss.push("}");elide=true}},startRuleset:function(selectorArray){if(!elide){var selector=void 0;if(blockStack[blockStack.length-1]==="@keyframes"){selector=selectorArray.join(" ").match(/^ *(?:from|to|\d+(?:\.\d+)?%) *(?:, *(?:from|to|\d+(?:\.\d+)?%) *)*$/i);elide=!selector;if(selector){selector=selector[0].replace(/ +/g,"")}}else{var selectors=sanitizeCssSelectorList(selectorArray,virtualization);if(!selectors||!selectors.length){elide=true}else{selector=selectors.join(", ")}}if(!elide){safeCss.push(selector,"{")}}blockStack.push(null)},endRuleset:function(){blockStack.pop();if(!elide){safeCss.push("}")}checkElide()},declaration:function(property,valueArray){if(!elide){var isImportant=false;var nValues=valueArray.length;if(nValues>=2&&valueArray[nValues-2]==="!"&&valueArray[nValues-1].toLowerCase()==="important"){isImportant=true;valueArray.length-=2}sanitizeCssProperty(property,valueArray,naiveUriRewriter,baseUri,virtualization.idSuffix);if(valueArray.length){safeCss.push(property,":",valueArray.join(" "),isImportant?" !important;":";")}}}});function checkElide(){elide=blockStack.length&&blockStack[blockStack.length-1]===null}return{result:{toString:function(){return safeCss.join("")}},moreToCome:!!importCount[0]}}sanitizeStylesheet=function(baseUri,cssText,virtualization,naiveUriRewriter){return sanitizeStylesheetInternal(baseUri,cssText,virtualization,naiveUriRewriter,undefined,undefined).result.toString()};sanitizeStylesheetWithExternals=function(baseUri,cssText,virtualization,naiveUriRewriter,naiveUriFetcher,continuation){return sanitizeStylesheetInternal(baseUri,cssText,virtualization,naiveUriRewriter,naiveUriFetcher,continuation)}})()})();if(typeof window!=="undefined"){window["sanitizeCssProperty"]=sanitizeCssProperty;window["sanitizeCssSelectorList"]=sanitizeCssSelectorList;window["sanitizeStylesheet"]=sanitizeStylesheet;window["sanitizeMediaQuery"]=sanitizeMediaQuery}if("I".toLowerCase()!=="i"){throw"I/i problem"}var parseCssStylesheet;var parseCssDeclarations;(function(){parseCssStylesheet=function(cssText,handler){var toks=lexCss(cssText);if(handler["startStylesheet"]){handler["startStylesheet"]()}for(var i=0,n=toks.length;i<n;){i=toks[i]===" "?i+1:statement(toks,i,n,handler)}if(handler["endStylesheet"]){handler["endStylesheet"]()}};function statement(toks,i,n,handler){if(i<n){var tok=toks[i];if(tok.charAt(0)==="@"){return atrule(toks,i,n,handler,true)}else{return ruleset(toks,i,n,handler)}}else{return i}}function atrule(toks,i,n,handler,blockok){var start=i++;while(i<n&&toks[i]!=="{"&&toks[i]!==";"){++i}if(i<n&&(blockok||toks[i]===";")){var s=start+1,e=i;if(s<n&&toks[s]===" "){++s}if(e>s&&toks[e-1]===" "){--e}if(handler["startAtrule"]){handler["startAtrule"](toks[start].toLowerCase(),toks.slice(s,e))}i=toks[i]==="{"?block(toks,i,n,handler):i+1;if(handler["endAtrule"]){handler["endAtrule"]()}}return i}function block(toks,i,n,handler){++i;if(handler["startBlock"]){handler["startBlock"]()}while(i<n){var ch=toks[i].charAt(0);if(ch=="}"){++i;break}if(ch===" "||ch===";"){i=i+1}else if(ch==="@"){i=atrule(toks,i,n,handler,false)}else if(ch==="{"){i=block(toks,i,n,handler)}else{i=ruleset(toks,i,n,handler)}}if(handler["endBlock"]){handler["endBlock"]()}return i}function ruleset(toks,i,n,handler){var s=i,e=selector(toks,i,n,true);if(e<0){e=~e;return e===s?e+1:e}var tok=toks[e];if(tok!=="{"){return e===s?e+1:e}i=e+1;if(e>s&&toks[e-1]===" "){--e}if(handler["startRuleset"]){handler["startRuleset"](toks.slice(s,e))}while(i<n){tok=toks[i];if(tok==="}"){++i;break}if(tok===" "){i=i+1}else{i=declaration(toks,i,n,handler)}}if(handler["endRuleset"]){handler["endRuleset"]()}return i}function selector(toks,i,n,allowSemi){var s=i;var tok;var brackets=[],stackLast=-1;for(;i<n;++i){tok=toks[i].charAt(0);if(tok==="["||tok==="("){brackets[++stackLast]=tok}else if(tok==="]"&&brackets[stackLast]==="["||tok===")"&&brackets[stackLast]==="("){--stackLast}else if(tok==="{"||tok==="}"||tok===";"||tok==="@"||tok===":"&&!allowSemi){break}}if(stackLast>=0){i=~(i+1)}return i}var ident=/^-?[a-z]/i;function skipDeclaration(toks,i,n){while(i<n&&toks[i]!==";"&&toks[i]!=="}"){++i}return i<n&&toks[i]===";"?i+1:i}function declaration(toks,i,n,handler){var property=toks[i++];if(!ident.test(property)){return skipDeclaration(toks,i,n)}var tok;if(i<n&&toks[i]===" "){++i}if(i==n||toks[i]!==":"){return skipDeclaration(toks,i,n)}++i;if(i<n&&toks[i]===" "){++i}var s=i,e=selector(toks,i,n,false);if(e<0){e=~e}else{var value=[],valuelen=0;for(var j=s;j<e;++j){tok=toks[j];if(tok!==" "){value[valuelen++]=tok}}if(e<n){do{tok=toks[e];if(tok===";"||tok==="}"){break}valuelen=0}while(++e<n);if(tok===";"){++e}}if(valuelen&&handler["declaration"]){handler["declaration"](property.toLowerCase(),value)}}return e}parseCssDeclarations=function(cssText,handler){var toks=lexCss(cssText);for(var i=0,n=toks.length;i<n;){i=toks[i]!==" "?declaration(toks,i,n,handler):i+1}}})();if(typeof window!=="undefined"){window["parseCssStylesheet"]=parseCssStylesheet;window["parseCssDeclarations"]=parseCssDeclarations}var html4={};html4.atype={NONE:0,URI:1,URI_FRAGMENT:11,SCRIPT:2,STYLE:3,HTML:12,ID:4,IDREF:5,IDREFS:6,GLOBAL_NAME:7,LOCAL_NAME:8,CLASSES:9,FRAME_TARGET:10,MEDIA_QUERY:13};html4["atype"]=html4.atype;html4.ATTRIBS={"*::class":9,"*::dir":0,"*::draggable":0,"*::hidden":0,"*::id":4,"*::inert":0,"*::itemprop":0,"*::itemref":6,"*::itemscope":0,"*::lang":0,"*::onblur":2,"*::onchange":2,"*::onclick":2,"*::ondblclick":2,"*::onerror":2,"*::onfocus":2,"*::onkeydown":2,"*::onkeypress":2,"*::onkeyup":2,"*::onload":2,"*::onmousedown":2,"*::onmousemove":2,"*::onmouseout":2,"*::onmouseover":2,"*::onmouseup":2,"*::onreset":2,"*::onscroll":2,"*::onselect":2,"*::onsubmit":2,"*::ontouchcancel":2,"*::ontouchend":2,"*::ontouchenter":2,"*::ontouchleave":2,"*::ontouchmove":2,"*::ontouchstart":2,"*::onunload":2,"*::spellcheck":0,"*::style":3,"*::title":0,"*::translate":0,"a::accesskey":0,"a::coords":0,"a::href":1,"a::hreflang":0,"a::name":7,"a::onblur":2,"a::onfocus":2,"a::shape":0,"a::tabindex":0,"a::target":10,"a::type":0,"area::accesskey":0,"area::alt":0,"area::coords":0,"area::href":1,"area::nohref":0,"area::onblur":2,"area::onfocus":2,"area::shape":0,"area::tabindex":0,"area::target":10,"audio::controls":0,"audio::loop":0,"audio::mediagroup":5,"audio::muted":0,"audio::preload":0,"audio::src":1,"bdo::dir":0,"blockquote::cite":1,"br::clear":0,"button::accesskey":0,"button::disabled":0,"button::name":8,"button::onblur":2,"button::onfocus":2,"button::tabindex":0,"button::type":0,"button::value":0,"canvas::height":0,"canvas::width":0,"caption::align":0,"col::align":0,"col::char":0,"col::charoff":0,"col::span":0,"col::valign":0,"col::width":0,"colgroup::align":0,"colgroup::char":0,"colgroup::charoff":0,"colgroup::span":0,"colgroup::valign":0,"colgroup::width":0,"command::checked":0,"command::command":5,"command::disabled":0,"command::icon":1,"command::label":0,"command::radiogroup":0,"command::type":0,"data::value":0,"del::cite":1,"del::datetime":0,"details::open":0,"dir::compact":0,"div::align":0,"dl::compact":0,"fieldset::disabled":0,"font::color":0,"font::face":0,"font::size":0,"form::accept":0,"form::action":1,"form::autocomplete":0,"form::enctype":0,"form::method":0,"form::name":7,"form::novalidate":0,"form::onreset":2,"form::onsubmit":2,"form::target":10,"h1::align":0,"h2::align":0,"h3::align":0,"h4::align":0,"h5::align":0,"h6::align":0,"hr::align":0,"hr::noshade":0,"hr::size":0,"hr::width":0,"iframe::align":0,"iframe::frameborder":0,"iframe::height":0,"iframe::marginheight":0,"iframe::marginwidth":0,"iframe::width":0,"img::align":0,"img::alt":0,"img::border":0,"img::height":0,"img::hspace":0,"img::ismap":0,"img::name":7,"img::src":1,"img::usemap":11,"img::vspace":0,"img::width":0,"input::accept":0,"input::accesskey":0,"input::align":0,"input::alt":0,"input::autocomplete":0,"input::checked":0,"input::disabled":0,"input::inputmode":0,"input::ismap":0,"input::list":5,"input::max":0,"input::maxlength":0,"input::min":0,"input::multiple":0,"input::name":8,"input::onblur":2,"input::onchange":2,"input::onfocus":2,"input::onselect":2,"input::placeholder":0,"input::readonly":0,"input::required":0,"input::size":0,"input::src":1,"input::step":0,"input::tabindex":0,"input::type":0,"input::usemap":11,"input::value":0,"ins::cite":1,"ins::datetime":0,"label::accesskey":0,"label::for":5,"label::onblur":2,"label::onfocus":2,"legend::accesskey":0,"legend::align":0,"li::type":0,"li::value":0,"map::name":7,"menu::compact":0,"menu::label":0,"menu::type":0,"meter::high":0,"meter::low":0,"meter::max":0,"meter::min":0,"meter::value":0,"ol::compact":0,"ol::reversed":0,"ol::start":0,"ol::type":0,"optgroup::disabled":0,"optgroup::label":0,"option::disabled":0,"option::label":0,"option::selected":0,"option::value":0,"output::for":6,"output::name":8,"p::align":0,"pre::width":0,"progress::max":0,"progress::min":0,"progress::value":0,"q::cite":1,"select::autocomplete":0,"select::disabled":0,"select::multiple":0,"select::name":8,"select::onblur":2,"select::onchange":2,"select::onfocus":2,"select::required":0,"select::size":0,"select::tabindex":0,"source::type":0,"table::align":0,"table::bgcolor":0,"table::border":0,"table::cellpadding":0,"table::cellspacing":0,"table::frame":0,"table::rules":0,"table::summary":0,"table::width":0,"tbody::align":0,"tbody::char":0,"tbody::charoff":0,"tbody::valign":0,"td::abbr":0,"td::align":0,"td::axis":0,"td::bgcolor":0,"td::char":0,"td::charoff":0,"td::colspan":0,"td::headers":6,"td::height":0,"td::nowrap":0,"td::rowspan":0,"td::scope":0,"td::valign":0,"td::width":0,"textarea::accesskey":0,"textarea::autocomplete":0,"textarea::cols":0,"textarea::disabled":0,"textarea::inputmode":0,"textarea::name":8,"textarea::onblur":2,"textarea::onchange":2,"textarea::onfocus":2,"textarea::onselect":2,"textarea::placeholder":0,"textarea::readonly":0,"textarea::required":0,"textarea::rows":0,"textarea::tabindex":0,"textarea::wrap":0,"tfoot::align":0,"tfoot::char":0,"tfoot::charoff":0,"tfoot::valign":0,"th::abbr":0,"th::align":0,"th::axis":0,"th::bgcolor":0,"th::char":0,"th::charoff":0,"th::colspan":0,"th::headers":6,"th::height":0,"th::nowrap":0,"th::rowspan":0,"th::scope":0,"th::valign":0,"th::width":0,"thead::align":0,"thead::char":0,"thead::charoff":0,"thead::valign":0,"tr::align":0,"tr::bgcolor":0,"tr::char":0,"tr::charoff":0,"tr::valign":0,"track::default":0,"track::kind":0,"track::label":0,"track::srclang":0,"ul::compact":0,"ul::type":0,"video::controls":0,"video::height":0,"video::loop":0,"video::mediagroup":5,"video::muted":0,"video::poster":1,"video::preload":0,"video::src":1,"video::width":0};html4["ATTRIBS"]=html4.ATTRIBS;html4.eflags={OPTIONAL_ENDTAG:1,EMPTY:2,CDATA:4,RCDATA:8,UNSAFE:16,FOLDABLE:32,SCRIPT:64,STYLE:128,VIRTUALIZED:256};html4["eflags"]=html4.eflags;html4.ELEMENTS={a:0,abbr:0,acronym:0,address:0,applet:272,area:2,article:0,aside:0,audio:0,b:0,base:274,basefont:274,bdi:0,bdo:0,big:0,blockquote:0,body:305,br:2,button:0,canvas:0,caption:0,center:0,cite:0,code:0,col:2,colgroup:1,command:2,data:0,datalist:0,dd:1,del:0,details:0,dfn:0,dialog:272,dir:0,div:0,dl:0,dt:1,em:0,fieldset:0,figcaption:0,figure:0,font:0,footer:0,form:0,frame:274,frameset:272,h1:0,h2:0,h3:0,h4:0,h5:0,h6:0,head:305,header:0,hgroup:0,hr:2,html:305,i:0,iframe:4,img:2,input:2,ins:0,isindex:274,kbd:0,keygen:274,label:0,legend:0,li:1,link:274,map:0,mark:0,menu:0,meta:274,meter:0,nav:0,nobr:0,noembed:276,noframes:276,noscript:276,object:272,ol:0,optgroup:0,option:1,output:0,p:1,param:274,pre:0,progress:0,q:0,s:0,samp:0,script:84,section:0,select:0,small:0,source:2,span:0,strike:0,strong:0,style:148,sub:0,summary:0,sup:0,table:0,tbody:1,td:1,textarea:8,tfoot:1,th:1,thead:1,time:0,title:280,tr:1,track:2,tt:0,u:0,ul:0,"var":0,video:0,wbr:2};html4["ELEMENTS"]=html4.ELEMENTS;html4.ELEMENT_DOM_INTERFACES={a:"HTMLAnchorElement",abbr:"HTMLElement",acronym:"HTMLElement",address:"HTMLElement",applet:"HTMLAppletElement",area:"HTMLAreaElement",article:"HTMLElement",aside:"HTMLElement",audio:"HTMLAudioElement",b:"HTMLElement",base:"HTMLBaseElement",basefont:"HTMLBaseFontElement",bdi:"HTMLElement",bdo:"HTMLElement",big:"HTMLElement",blockquote:"HTMLQuoteElement",body:"HTMLBodyElement",br:"HTMLBRElement",button:"HTMLButtonElement",canvas:"HTMLCanvasElement",caption:"HTMLTableCaptionElement",center:"HTMLElement",cite:"HTMLElement",code:"HTMLElement",col:"HTMLTableColElement",colgroup:"HTMLTableColElement",command:"HTMLCommandElement",data:"HTMLElement",datalist:"HTMLDataListElement",dd:"HTMLElement",del:"HTMLModElement",details:"HTMLDetailsElement",dfn:"HTMLElement",dialog:"HTMLDialogElement",dir:"HTMLDirectoryElement",div:"HTMLDivElement",dl:"HTMLDListElement",dt:"HTMLElement",em:"HTMLElement",fieldset:"HTMLFieldSetElement",figcaption:"HTMLElement",figure:"HTMLElement",font:"HTMLFontElement",footer:"HTMLElement",form:"HTMLFormElement",frame:"HTMLFrameElement",frameset:"HTMLFrameSetElement",h1:"HTMLHeadingElement",h2:"HTMLHeadingElement",h3:"HTMLHeadingElement",h4:"HTMLHeadingElement",h5:"HTMLHeadingElement",h6:"HTMLHeadingElement",head:"HTMLHeadElement",header:"HTMLElement",hgroup:"HTMLElement",hr:"HTMLHRElement",html:"HTMLHtmlElement",i:"HTMLElement",iframe:"HTMLIFrameElement",img:"HTMLImageElement",input:"HTMLInputElement",ins:"HTMLModElement",isindex:"HTMLUnknownElement",kbd:"HTMLElement",keygen:"HTMLKeygenElement",label:"HTMLLabelElement",legend:"HTMLLegendElement",li:"HTMLLIElement",link:"HTMLLinkElement",map:"HTMLMapElement",mark:"HTMLElement",menu:"HTMLMenuElement",meta:"HTMLMetaElement",meter:"HTMLMeterElement",nav:"HTMLElement",nobr:"HTMLElement",noembed:"HTMLElement",noframes:"HTMLElement",noscript:"HTMLElement",object:"HTMLObjectElement",ol:"HTMLOListElement",optgroup:"HTMLOptGroupElement",option:"HTMLOptionElement",output:"HTMLOutputElement",p:"HTMLParagraphElement",param:"HTMLParamElement",pre:"HTMLPreElement",progress:"HTMLProgressElement",q:"HTMLQuoteElement",s:"HTMLElement",samp:"HTMLElement",script:"HTMLScriptElement",section:"HTMLElement",select:"HTMLSelectElement",small:"HTMLElement",source:"HTMLSourceElement",span:"HTMLSpanElement",strike:"HTMLElement",strong:"HTMLElement",style:"HTMLStyleElement",sub:"HTMLElement",summary:"HTMLElement",sup:"HTMLElement",table:"HTMLTableElement",tbody:"HTMLTableSectionElement",td:"HTMLTableDataCellElement",textarea:"HTMLTextAreaElement",tfoot:"HTMLTableSectionElement",th:"HTMLTableHeaderCellElement",thead:"HTMLTableSectionElement",time:"HTMLTimeElement",title:"HTMLTitleElement",tr:"HTMLTableRowElement",track:"HTMLTrackElement",tt:"HTMLElement",u:"HTMLElement",ul:"HTMLUListElement","var":"HTMLElement",video:"HTMLVideoElement",wbr:"HTMLElement"};html4["ELEMENT_DOM_INTERFACES"]=html4.ELEMENT_DOM_INTERFACES;html4.ueffects={NOT_LOADED:0,SAME_DOCUMENT:1,NEW_DOCUMENT:2};html4["ueffects"]=html4.ueffects;html4.URIEFFECTS={"a::href":2,"area::href":2,"audio::src":1,"blockquote::cite":0,"command::icon":1,"del::cite":0,"form::action":2,"img::src":1,"input::src":1,"ins::cite":0,"q::cite":0,"video::poster":1,"video::src":1};html4["URIEFFECTS"]=html4.URIEFFECTS;html4.ltypes={UNSANDBOXED:2,SANDBOXED:1,DATA:0};html4["ltypes"]=html4.ltypes;html4.LOADERTYPES={"a::href":2,"area::href":2,"audio::src":2,"blockquote::cite":2,"command::icon":1,"del::cite":2,"form::action":2,"img::src":1,"input::src":1,"ins::cite":2,"q::cite":2,"video::poster":1,"video::src":2};html4["LOADERTYPES"]=html4.LOADERTYPES;if(typeof window!=="undefined"){window["html4"]=html4}if("I".toLowerCase()!=="i"){throw"I/i problem"}var html=function(html4){var parseCssDeclarations,sanitizeCssProperty,cssSchema;if("undefined"!==typeof window){parseCssDeclarations=window["parseCssDeclarations"];sanitizeCssProperty=window["sanitizeCssProperty"];cssSchema=window["cssSchema"]}var ENTITIES={lt:"<",LT:"<",gt:">",GT:">",amp:"&",AMP:"&",quot:'"',apos:"'",nbsp:" "};var decimalEscapeRe=/^#(\d+)$/;var hexEscapeRe=/^#x([0-9A-Fa-f]+)$/;var safeEntityNameRe=/^[A-Za-z][A-za-z0-9]+$/;var entityLookupElement="undefined"!==typeof window&&window["document"]?window["document"].createElement("textarea"):null;function lookupEntity(name){if(ENTITIES.hasOwnProperty(name)){return ENTITIES[name]}var m=name.match(decimalEscapeRe);if(m){return String.fromCharCode(parseInt(m[1],10))}else if(!!(m=name.match(hexEscapeRe))){return String.fromCharCode(parseInt(m[1],16))}else if(entityLookupElement&&safeEntityNameRe.test(name)){entityLookupElement.innerHTML="&"+name+";";var text=entityLookupElement.textContent;ENTITIES[name]=text;return text}else{return"&"+name+";"}}function decodeOneEntity(_,name){return lookupEntity(name)}var nulRe=/\0/g;function stripNULs(s){return s.replace(nulRe,"")}var ENTITY_RE_1=/&(#[0-9]+|#[xX][0-9A-Fa-f]+|\w+);/g;var ENTITY_RE_2=/^(#[0-9]+|#[xX][0-9A-Fa-f]+|\w+);/;function unescapeEntities(s){return s.replace(ENTITY_RE_1,decodeOneEntity)}var ampRe=/&/g;var looseAmpRe=/&([^a-z#]|#(?:[^0-9x]|x(?:[^0-9a-f]|$)|$)|$)/gi;var ltRe=/[<]/g;var gtRe=/>/g;var quotRe=/\"/g;function escapeAttrib(s){return(""+s).replace(ampRe,"&amp;").replace(ltRe,"&lt;").replace(gtRe,"&gt;").replace(quotRe,"&#34;")}function normalizeRCData(rcdata){return rcdata.replace(looseAmpRe,"&amp;$1").replace(ltRe,"&lt;").replace(gtRe,"&gt;")}var ATTR_RE=new RegExp("^\\s*"+"([-.:\\w]+)"+"(?:"+("\\s*(=)\\s*"+"("+('(")[^"]*("|$)'+"|"+"(')[^']*('|$)"+"|"+"(?=[a-z][-\\w]*\\s*=)"+"|"+"[^\"'\\s]*")+")")+")?","i");var splitWillCapture="a,b".split(/(,)/).length===3;var EFLAGS_TEXT=html4.eflags["CDATA"]|html4.eflags["RCDATA"];function makeSaxParser(handler){var hcopy={cdata:handler.cdata||handler["cdata"],comment:handler.comment||handler["comment"],endDoc:handler.endDoc||handler["endDoc"],endTag:handler.endTag||handler["endTag"],pcdata:handler.pcdata||handler["pcdata"],rcdata:handler.rcdata||handler["rcdata"],startDoc:handler.startDoc||handler["startDoc"],startTag:handler.startTag||handler["startTag"]};return function(htmlText,param){return parse(htmlText,hcopy,param)}}var continuationMarker={};function parse(htmlText,handler,param){var m,p,tagName;var parts=htmlSplit(htmlText);var state={noMoreGT:false,noMoreEndComments:false};parseCPS(handler,parts,0,state,param)}function continuationMaker(h,parts,initial,state,param){return function(){parseCPS(h,parts,initial,state,param)}}function parseCPS(h,parts,initial,state,param){try{if(h.startDoc&&initial==0){h.startDoc(param)}var m,p,tagName;for(var pos=initial,end=parts.length;pos<end;){var current=parts[pos++];var next=parts[pos];switch(current){case"&":if(ENTITY_RE_2.test(next)){if(h.pcdata){h.pcdata("&"+next,param,continuationMarker,continuationMaker(h,parts,pos,state,param))}pos++}else{if(h.pcdata){h.pcdata("&amp;",param,continuationMarker,continuationMaker(h,parts,pos,state,param))}}break;case"</":if(m=/^([-\w:]+)[^\'\"]*/.exec(next)){if(m[0].length===next.length&&parts[pos+1]===">"){pos+=2;tagName=m[1].toLowerCase();if(h.endTag){h.endTag(tagName,param,continuationMarker,continuationMaker(h,parts,pos,state,param))}}else{pos=parseEndTag(parts,pos,h,param,continuationMarker,state)}}else{if(h.pcdata){h.pcdata("&lt;/",param,continuationMarker,continuationMaker(h,parts,pos,state,param))}}break;case"<":if(m=/^([-\w:]+)\s*\/?/.exec(next)){if(m[0].length===next.length&&parts[pos+1]===">"){pos+=2;tagName=m[1].toLowerCase();if(h.startTag){h.startTag(tagName,[],param,continuationMarker,continuationMaker(h,parts,pos,state,param))}var eflags=html4.ELEMENTS[tagName];if(eflags&EFLAGS_TEXT){var tag={name:tagName,next:pos,eflags:eflags};pos=parseText(parts,tag,h,param,continuationMarker,state)}}else{pos=parseStartTag(parts,pos,h,param,continuationMarker,state)}}else{if(h.pcdata){h.pcdata("&lt;",param,continuationMarker,continuationMaker(h,parts,pos,state,param))}}break;case"<!--":if(!state.noMoreEndComments){for(p=pos+1;p<end;p++){if(parts[p]===">"&&/--$/.test(parts[p-1])){break}}if(p<end){if(h.comment){var comment=parts.slice(pos,p).join("");h.comment(comment.substr(0,comment.length-2),param,continuationMarker,continuationMaker(h,parts,p+1,state,param))}pos=p+1}else{state.noMoreEndComments=true}}if(state.noMoreEndComments){if(h.pcdata){h.pcdata("&lt;!--",param,continuationMarker,continuationMaker(h,parts,pos,state,param))}}break;case"<!":if(!/^\w/.test(next)){if(h.pcdata){h.pcdata("&lt;!",param,continuationMarker,continuationMaker(h,parts,pos,state,param))}}else{if(!state.noMoreGT){for(p=pos+1;p<end;p++){if(parts[p]===">"){break}}if(p<end){pos=p+1}else{state.noMoreGT=true}}if(state.noMoreGT){if(h.pcdata){h.pcdata("&lt;!",param,continuationMarker,continuationMaker(h,parts,pos,state,param))}}}break;case"<?":if(!state.noMoreGT){for(p=pos+1;p<end;p++){if(parts[p]===">"){break}}if(p<end){pos=p+1}else{state.noMoreGT=true}}if(state.noMoreGT){if(h.pcdata){h.pcdata("&lt;?",param,continuationMarker,continuationMaker(h,parts,pos,state,param))}}break;case">":if(h.pcdata){h.pcdata("&gt;",param,continuationMarker,continuationMaker(h,parts,pos,state,param))}break;case"":break;default:if(h.pcdata){h.pcdata(current,param,continuationMarker,continuationMaker(h,parts,pos,state,param))}break}}if(h.endDoc){h.endDoc(param)}}catch(e){if(e!==continuationMarker){throw e}}}function htmlSplit(str){var re=/(<\/|<\!--|<[!?]|[&<>])/g;str+="";if(splitWillCapture){return str.split(re)}else{var parts=[];var lastPos=0;var m;while((m=re.exec(str))!==null){parts.push(str.substring(lastPos,m.index));parts.push(m[0]);lastPos=m.index+m[0].length}parts.push(str.substring(lastPos));return parts}}function parseEndTag(parts,pos,h,param,continuationMarker,state){var tag=parseTagAndAttrs(parts,pos);if(!tag){return parts.length}if(h.endTag){h.endTag(tag.name,param,continuationMarker,continuationMaker(h,parts,pos,state,param))}return tag.next}function parseStartTag(parts,pos,h,param,continuationMarker,state){var tag=parseTagAndAttrs(parts,pos);if(!tag){return parts.length}if(h.startTag){h.startTag(tag.name,tag.attrs,param,continuationMarker,continuationMaker(h,parts,tag.next,state,param))}if(tag.eflags&EFLAGS_TEXT){return parseText(parts,tag,h,param,continuationMarker,state)}else{return tag.next}}var endTagRe={};function parseText(parts,tag,h,param,continuationMarker,state){var end=parts.length;if(!endTagRe.hasOwnProperty(tag.name)){endTagRe[tag.name]=new RegExp("^"+tag.name+"(?:[\\s\\/]|$)","i")}var re=endTagRe[tag.name];var first=tag.next;var p=tag.next+1;for(;p<end;p++){if(parts[p-1]==="</"&&re.test(parts[p])){break}}if(p<end){p-=1}var buf=parts.slice(first,p).join("");if(tag.eflags&html4.eflags["CDATA"]){if(h.cdata){h.cdata(buf,param,continuationMarker,continuationMaker(h,parts,p,state,param))}}else if(tag.eflags&html4.eflags["RCDATA"]){if(h.rcdata){h.rcdata(normalizeRCData(buf),param,continuationMarker,continuationMaker(h,parts,p,state,param))}}else{throw new Error("bug")}return p}function parseTagAndAttrs(parts,pos){var m=/^([-\w:]+)/.exec(parts[pos]);var tag={};tag.name=m[1].toLowerCase();tag.eflags=html4.ELEMENTS[tag.name];var buf=parts[pos].substr(m[0].length);var p=pos+1;var end=parts.length;for(;p<end;p++){if(parts[p]===">"){break}buf+=parts[p]}if(end<=p){return void 0}var attrs=[];while(buf!==""){m=ATTR_RE.exec(buf);if(!m){buf=buf.replace(/^[\s\S][^a-z\s]*/,"")}else if(m[4]&&!m[5]||m[6]&&!m[7]){var quote=m[4]||m[6];var sawQuote=false;var abuf=[buf,parts[p++]];for(;p<end;p++){if(sawQuote){if(parts[p]===">"){break}}else if(0<=parts[p].indexOf(quote)){sawQuote=true}abuf.push(parts[p])}if(end<=p){break}buf=abuf.join("");continue}else{var aName=m[1].toLowerCase();var aValue=m[2]?decodeValue(m[3]):"";attrs.push(aName,aValue);buf=buf.substr(m[0].length)}}tag.attrs=attrs;tag.next=p+1;return tag}function decodeValue(v){var q=v.charCodeAt(0);if(q===34||q===39){v=v.substr(1,v.length-2)}return unescapeEntities(stripNULs(v))}function makeHtmlSanitizer(tagPolicy){var stack;var ignoring;var emit=function(text,out){if(!ignoring){out.push(text)}};return makeSaxParser({startDoc:function(_){stack=[];ignoring=false},startTag:function(tagNameOrig,attribs,out){if(ignoring){return}if(!html4.ELEMENTS.hasOwnProperty(tagNameOrig)){return}var eflagsOrig=html4.ELEMENTS[tagNameOrig];if(eflagsOrig&html4.eflags["FOLDABLE"]){return}var decision=tagPolicy(tagNameOrig,attribs);if(!decision){ignoring=!(eflagsOrig&html4.eflags["EMPTY"]);
return}else if(typeof decision!=="object"){throw new Error("tagPolicy did not return object (old API?)")}if("attribs"in decision){attribs=decision["attribs"]}else{throw new Error("tagPolicy gave no attribs")}var eflagsRep;var tagNameRep;if("tagName"in decision){tagNameRep=decision["tagName"];eflagsRep=html4.ELEMENTS[tagNameRep]}else{tagNameRep=tagNameOrig;eflagsRep=eflagsOrig}if(eflagsOrig&html4.eflags["OPTIONAL_ENDTAG"]){var onStack=stack[stack.length-1];if(onStack&&onStack.orig===tagNameOrig&&(onStack.rep!==tagNameRep||tagNameOrig!==tagNameRep)){out.push("</",onStack.rep,">")}}if(!(eflagsOrig&html4.eflags["EMPTY"])){stack.push({orig:tagNameOrig,rep:tagNameRep})}out.push("<",tagNameRep);for(var i=0,n=attribs.length;i<n;i+=2){var attribName=attribs[i],value=attribs[i+1];if(value!==null&&value!==void 0){out.push(" ",attribName,'="',escapeAttrib(value),'"')}}out.push(">");if(eflagsOrig&html4.eflags["EMPTY"]&&!(eflagsRep&html4.eflags["EMPTY"])){out.push("</",tagNameRep,">")}},endTag:function(tagName,out){if(ignoring){ignoring=false;return}if(!html4.ELEMENTS.hasOwnProperty(tagName)){return}var eflags=html4.ELEMENTS[tagName];if(!(eflags&(html4.eflags["EMPTY"]|html4.eflags["FOLDABLE"]))){var index;if(eflags&html4.eflags["OPTIONAL_ENDTAG"]){for(index=stack.length;--index>=0;){var stackElOrigTag=stack[index].orig;if(stackElOrigTag===tagName){break}if(!(html4.ELEMENTS[stackElOrigTag]&html4.eflags["OPTIONAL_ENDTAG"])){return}}}else{for(index=stack.length;--index>=0;){if(stack[index].orig===tagName){break}}}if(index<0){return}for(var i=stack.length;--i>index;){var stackElRepTag=stack[i].rep;if(!(html4.ELEMENTS[stackElRepTag]&html4.eflags["OPTIONAL_ENDTAG"])){out.push("</",stackElRepTag,">")}}if(index<stack.length){tagName=stack[index].rep}stack.length=index;out.push("</",tagName,">")}},pcdata:emit,rcdata:emit,cdata:emit,endDoc:function(out){for(;stack.length;stack.length--){out.push("</",stack[stack.length-1].rep,">")}}})}var ALLOWED_URI_SCHEMES=/^(?:https?|mailto)$/i;function safeUri(uri,effect,ltype,hints,naiveUriRewriter){if(!naiveUriRewriter){return null}try{var parsed=URI.parse(""+uri);if(parsed){if(!parsed.hasScheme()||ALLOWED_URI_SCHEMES.test(parsed.getScheme())){var safe=naiveUriRewriter(parsed,effect,ltype,hints);return safe?safe.toString():null}}}catch(e){return null}return null}function log(logger,tagName,attribName,oldValue,newValue){if(!attribName){logger(tagName+" removed",{change:"removed",tagName:tagName})}if(oldValue!==newValue){var changed="changed";if(oldValue&&!newValue){changed="removed"}else if(!oldValue&&newValue){changed="added"}logger(tagName+"."+attribName+" "+changed,{change:changed,tagName:tagName,attribName:attribName,oldValue:oldValue,newValue:newValue})}}function lookupAttribute(map,tagName,attribName){var attribKey;attribKey=tagName+"::"+attribName;if(map.hasOwnProperty(attribKey)){return map[attribKey]}attribKey="*::"+attribName;if(map.hasOwnProperty(attribKey)){return map[attribKey]}return void 0}function getAttributeType(tagName,attribName){return lookupAttribute(html4.ATTRIBS,tagName,attribName)}function getLoaderType(tagName,attribName){return lookupAttribute(html4.LOADERTYPES,tagName,attribName)}function getUriEffect(tagName,attribName){return lookupAttribute(html4.URIEFFECTS,tagName,attribName)}function sanitizeAttribs(tagName,attribs,opt_naiveUriRewriter,opt_nmTokenPolicy,opt_logger){for(var i=0;i<attribs.length;i+=2){var attribName=attribs[i];var value=attribs[i+1];var oldValue=value;var atype=null,attribKey;if((attribKey=tagName+"::"+attribName,html4.ATTRIBS.hasOwnProperty(attribKey))||(attribKey="*::"+attribName,html4.ATTRIBS.hasOwnProperty(attribKey))){atype=html4.ATTRIBS[attribKey]}if(atype!==null){switch(atype){case html4.atype["NONE"]:break;case html4.atype["SCRIPT"]:value=null;if(opt_logger){log(opt_logger,tagName,attribName,oldValue,value)}break;case html4.atype["STYLE"]:if("undefined"===typeof parseCssDeclarations){value=null;if(opt_logger){log(opt_logger,tagName,attribName,oldValue,value)}break}var sanitizedDeclarations=[];parseCssDeclarations(value,{declaration:function(property,tokens){var normProp=property.toLowerCase();sanitizeCssProperty(normProp,tokens,opt_naiveUriRewriter?function(url){return safeUri(url,html4.ueffects.SAME_DOCUMENT,html4.ltypes.SANDBOXED,{TYPE:"CSS",CSS_PROP:normProp},opt_naiveUriRewriter)}:null);if(tokens.length){sanitizedDeclarations.push(normProp+": "+tokens.join(" "))}}});value=sanitizedDeclarations.length>0?sanitizedDeclarations.join(" ; "):null;if(opt_logger){log(opt_logger,tagName,attribName,oldValue,value)}break;case html4.atype["ID"]:case html4.atype["IDREF"]:case html4.atype["IDREFS"]:case html4.atype["GLOBAL_NAME"]:case html4.atype["LOCAL_NAME"]:case html4.atype["CLASSES"]:value=opt_nmTokenPolicy?opt_nmTokenPolicy(value):value;if(opt_logger){log(opt_logger,tagName,attribName,oldValue,value)}break;case html4.atype["URI"]:value=safeUri(value,getUriEffect(tagName,attribName),getLoaderType(tagName,attribName),{TYPE:"MARKUP",XML_ATTR:attribName,XML_TAG:tagName},opt_naiveUriRewriter);if(opt_logger){log(opt_logger,tagName,attribName,oldValue,value)}break;case html4.atype["URI_FRAGMENT"]:if(value&&"#"===value.charAt(0)){value=value.substring(1);value=opt_nmTokenPolicy?opt_nmTokenPolicy(value):value;if(value!==null&&value!==void 0){value="#"+value}}else{value=null}if(opt_logger){log(opt_logger,tagName,attribName,oldValue,value)}break;default:value=null;if(opt_logger){log(opt_logger,tagName,attribName,oldValue,value)}break}}else{value=null;if(opt_logger){log(opt_logger,tagName,attribName,oldValue,value)}}attribs[i+1]=value}return attribs}function makeTagPolicy(opt_naiveUriRewriter,opt_nmTokenPolicy,opt_logger){return function(tagName,attribs){if(!(html4.ELEMENTS[tagName]&html4.eflags["UNSAFE"])){return{attribs:sanitizeAttribs(tagName,attribs,opt_naiveUriRewriter,opt_nmTokenPolicy,opt_logger)}}else{if(opt_logger){log(opt_logger,tagName,undefined,undefined,undefined)}}}}function sanitizeWithPolicy(inputHtml,tagPolicy){var outputArray=[];makeHtmlSanitizer(tagPolicy)(inputHtml,outputArray);return outputArray.join("")}function sanitize(inputHtml,opt_naiveUriRewriter,opt_nmTokenPolicy,opt_logger){var tagPolicy=makeTagPolicy(opt_naiveUriRewriter,opt_nmTokenPolicy,opt_logger);return sanitizeWithPolicy(inputHtml,tagPolicy)}var html={};html.escapeAttrib=html["escapeAttrib"]=escapeAttrib;html.makeHtmlSanitizer=html["makeHtmlSanitizer"]=makeHtmlSanitizer;html.makeSaxParser=html["makeSaxParser"]=makeSaxParser;html.makeTagPolicy=html["makeTagPolicy"]=makeTagPolicy;html.normalizeRCData=html["normalizeRCData"]=normalizeRCData;html.sanitize=html["sanitize"]=sanitize;html.sanitizeAttribs=html["sanitizeAttribs"]=sanitizeAttribs;html.sanitizeWithPolicy=html["sanitizeWithPolicy"]=sanitizeWithPolicy;html.unescapeEntities=html["unescapeEntities"]=unescapeEntities;return html}(html4);var html_sanitize=html["sanitize"];if(typeof window!=="undefined"){window["html"]=html;window["html_sanitize"]=html_sanitize}
},{}]},{},["/Users/jon/jupyter/notebook/notebook/static-src/auth/js/main.js"])