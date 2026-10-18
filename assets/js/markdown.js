/* ==========================================================================
   A small, dependency-free Markdown renderer.
   Supported: headings, bold/italic/strike, inline code, fenced code, links,
   images, lists (nested), blockquotes, tables, horizontal rules, paragraphs.
   Raw HTML is escaped on purpose: your posts are rendered as text, not code.
   ========================================================================== */
(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeUrl(url, isImage) {
    var value = String(url || "").trim();
    if (!value) return "";
    if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
    if (isImage && /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(value)) return value;
    if (/^\/\//.test(value)) return "https:" + value;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return "";
    return value;
  }

  function inline(text) {
    var codes = [];
    var source = escapeHtml(text);

    source = source.replace(/`([^`\n]+)`/g, function (_, code) {
      codes.push(code);
      return "\u0000C" + (codes.length - 1) + "\u0000";
    });

    source = source.replace(
      /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g,
      function (match, alt, url, title) {
        var src = safeUrl(url, true);
        if (!src) return alt;
        return (
          '<img src="' +
          src +
          '" alt="' +
          alt +
          '"' +
          (title ? ' title="' + title + '"' : "") +
          ' loading="lazy">'
        );
      }
    );

    source = source.replace(
      /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g,
      function (match, label, url, title) {
        var href = safeUrl(url, false);
        if (!href) return label;
        var external = /^https?:\/\//i.test(href)
          ? ' target="_blank" rel="noopener noreferrer"'
          : "";
        return (
          '<a href="' +
          href +
          '"' +
          (title ? ' title="' + title + '"' : "") +
          external +
          ">" +
          label +
          "</a>"
        );
      }
    );

    source = source.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    source = source.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    source = source.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

    source = source.replace(/\u0000C(\d+)\u0000/g, function (_, index) {
      return "<code>" + codes[Number(index)] + "</code>";
    });

    return source.replace(/\n/g, "<br>");
  }

  var LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

  function isTableSeparator(line) {
    return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
  }

  function splitRow(line) {
    return line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map(function (cell) {
        return cell.trim();
      });
  }

  function startsBlock(line, lines, index) {
    if (!line.trim()) return true;
    if (/^ {0,3}(#{1,6})\s+/.test(line)) return true;
    if (/^ {0,3}(`{3,}|~{3,})/.test(line)) return true;
    if (/^ {0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) return true;
    if (/^ {0,3}>\s?/.test(line)) return true;
    if (LIST_RE.test(line)) return true;
    if (line.indexOf("|") !== -1 && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      return true;
    }
    return false;
  }

  function renderList(lines) {
    var root = { children: [] };
    var stack = [{ indent: -1, node: root }];

    lines.forEach(function (line) {
      var match = line.match(LIST_RE);
      if (match) {
        var indent = match[1].replace(/\t/g, "  ").length;
        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
        var node = {
          text: match[3],
          ordered: /\d/.test(match[2]),
          children: []
        };
        stack[stack.length - 1].node.children.push(node);
        stack.push({ indent: indent, node: node });
      } else if (stack.length > 1) {
        stack[stack.length - 1].node.text += " " + line.trim();
      }
    });

    function renderNodes(nodes) {
      if (!nodes.length) return "";
      var tag = nodes[0].ordered ? "ol" : "ul";
      var html = "<" + tag + ">";
      nodes.forEach(function (node) {
        html += "<li>" + inline(node.text);
        if (node.children.length) html += renderNodes(node.children);
        html += "</li>";
      });
      return html + "</" + tag + ">";
    }

    return renderNodes(root.children);
  }

  function render(source) {
    var lines = String(source == null ? "" : source).replace(/\r\n?/g, "\n").split("\n");
    var out = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (!line.trim()) {
        i++;
        continue;
      }

      var fence = line.match(/^ {0,3}(`{3,}|~{3,})\s*([A-Za-z0-9_+-]*)\s*$/);
      if (fence) {
        var marker = fence[1].charAt(0);
        var size = fence[1].length;
        var lang = fence[2] || "";
        var buffer = [];
        i++;
        while (i < lines.length) {
          var closing = lines[i].match(/^ {0,3}(`{3,}|~{3,})\s*$/);
          if (closing && closing[1].charAt(0) === marker && closing[1].length >= size) {
            i++;
            break;
          }
          buffer.push(lines[i]);
          i++;
        }
        out.push(
          '<pre data-lang="' +
            escapeHtml(lang) +
            '"><code' +
            (lang ? ' class="language-' + escapeHtml(lang) + '"' : "") +
            ">" +
            escapeHtml(buffer.join("\n")) +
            "</code></pre>"
        );
        continue;
      }

      var heading = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (heading) {
        var level = heading[1].length;
        out.push("<h" + level + ">" + inline(heading[2]) + "</h" + level + ">");
        i++;
        continue;
      }

      if (/^ {0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        out.push("<hr>");
        i++;
        continue;
      }

      if (/^ {0,3}>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^ {0,3}>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^ {0,3}>\s?/, ""));
          i++;
        }
        out.push("<blockquote>" + render(quote.join("\n")) + "</blockquote>");
        continue;
      }

      if (
        line.indexOf("|") !== -1 &&
        i + 1 < lines.length &&
        isTableSeparator(lines[i + 1])
      ) {
        var head = splitRow(line);
        var aligns = splitRow(lines[i + 1]).map(function (cell) {
          if (/^:-+:$/.test(cell)) return "center";
          if (/^:-+$/.test(cell)) return "left";
          if (/^-+:$/.test(cell)) return "right";
          return "";
        });
        i += 2;
        var rows = [];
        while (i < lines.length && lines[i].trim() && lines[i].indexOf("|") !== -1) {
          rows.push(splitRow(lines[i]));
          i++;
        }
        var table = '<div class="table-wrap"><table><thead><tr>';
        head.forEach(function (cell, index) {
          var align = aligns[index] ? ' style="text-align:' + aligns[index] + '"' : "";
          table += "<th" + align + ">" + inline(cell) + "</th>";
        });
        table += "</tr></thead><tbody>";
        rows.forEach(function (row) {
          table += "<tr>";
          head.forEach(function (_, index) {
            var align = aligns[index] ? ' style="text-align:' + aligns[index] + '"' : "";
            table += "<td" + align + ">" + inline(row[index] || "") + "</td>";
          });
          table += "</tr>";
        });
        table += "</tbody></table></div>";
        out.push(table);
        continue;
      }

      if (LIST_RE.test(line)) {
        var block = [];
        while (i < lines.length) {
          var current = lines[i];
          if (LIST_RE.test(current)) {
            block.push(current);
            i++;
          } else if (block.length && current.trim() && /^\s{2,}\S/.test(current)) {
            block.push(current);
            i++;
          } else {
            break;
          }
        }
        out.push(renderList(block));
        continue;
      }

      var paragraph = [line];
      i++;
      while (i < lines.length && !startsBlock(lines[i], lines, i)) {
        paragraph.push(lines[i]);
        i++;
      }
      out.push("<p>" + inline(paragraph.join("\n")) + "</p>");
    }

    return out.join("\n");
  }

  window.PF = window.PF || {};
  window.PF.markdown = {
    render: render,
    inline: inline,
    escapeHtml: escapeHtml
  };
})();
