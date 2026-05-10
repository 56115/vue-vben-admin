<template>
  <div class="markdown-renderer" v-html="renderedContent" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import katex from 'katex';

const props = defineProps<{
  content: string;
  streaming?: boolean;
}>();

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderedContent = computed(() => {
  if (!props.content) return '';

  // During streaming, skip heavy markdown/katex rendering to keep UI responsive.
  // Just escape HTML and preserve newlines.
  if (props.streaming) {
    return props.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  let text = props.content;

  // Process LaTeX: $$...$$ (display) and $...$ (inline)
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula: string) => {
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return `<code class="katex-error">${formula}</code>`;
    }
  });

  text = text.replace(/\$([^\$\n]+?)\$/g, (_match, formula: string) => {
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `<code class="katex-error">${formula}</code>`;
    }
  });

  // Render markdown
  try {
    return marked.parse(text) as string;
  } catch {
    return text.replace(/\n/g, '<br>');
  }
});
</script>

<style>
.markdown-renderer {
  --md-code-bg: #f0f0f0;
  --md-code-color: inherit;
  --md-pre-bg: #1e1e1e;
  --md-pre-color: #d4d4d4;
  --md-blockquote-border: #d9d9d9;
  --md-blockquote-color: #595959;
  --md-th-bg: #fafafa;
  --md-td-border: #f0f0f0;
  --md-hr-border: #f0f0f0;
  --md-link-color: #1890ff;
  --md-katex-error-bg: #fff2f0;
  --md-katex-error-color: #ff4d4f;

  font-size: 14px;
  line-height: 1.7;
}

:root.dark .markdown-renderer,
.dark .markdown-renderer {
  --md-code-bg: #2a2a2a;
  --md-code-color: #e0e0e0;
  --md-pre-bg: #1a1a1a;
  --md-pre-color: #d4d4d4;
  --md-blockquote-border: #444;
  --md-blockquote-color: #aaa;
  --md-th-bg: #1f1f1f;
  --md-td-border: #303030;
  --md-hr-border: #303030;
  --md-link-color: #177ddc;
  --md-katex-error-bg: #2a1215;
  --md-katex-error-color: #e84749;
}

.markdown-renderer p {
  margin: 0 0 8px;
}

.markdown-renderer p:last-child {
  margin-bottom: 0;
}

.markdown-renderer pre {
  padding: 12px 16px;
  overflow-x: auto;
  background: var(--md-pre-bg);
  border-radius: 8px;
}

.markdown-renderer code {
  padding: 2px 6px;
  font-size: 13px;
  color: var(--md-code-color);
  background: var(--md-code-bg);
  border-radius: 4px;
}

.markdown-renderer pre code {
  padding: 0;
  color: var(--md-pre-color);
  background: none;
}

.markdown-renderer ul,
.markdown-renderer ol {
  padding-left: 20px;
  margin: 8px 0;
}

.markdown-renderer li {
  margin: 4px 0;
}

.markdown-renderer blockquote {
  padding: 4px 16px;
  margin: 8px 0;
  color: var(--md-blockquote-color);
  border-left: 3px solid var(--md-blockquote-border);
}

.markdown-renderer table {
  width: 100%;
  margin: 8px 0;
  border-collapse: collapse;
}

.markdown-renderer th,
.markdown-renderer td {
  padding: 8px 12px;
  text-align: left;
  border: 1px solid var(--md-td-border);
}

.markdown-renderer th {
  font-weight: 600;
  background: var(--md-th-bg);
}

.markdown-renderer h1,
.markdown-renderer h2,
.markdown-renderer h3 {
  margin: 16px 0 8px;
  font-weight: 600;
}

.markdown-renderer h1 {
  font-size: 20px;
}

.markdown-renderer h2 {
  font-size: 18px;
}

.markdown-renderer h3 {
  font-size: 16px;
}

.markdown-renderer hr {
  margin: 16px 0;
  border: none;
  border-top: 1px solid var(--md-hr-border);
}

.markdown-renderer a {
  color: var(--md-link-color);
  text-decoration: none;
}

.markdown-renderer a:hover {
  text-decoration: underline;
}

.markdown-renderer .katex-display {
  margin: 8px 0;
  overflow-x: auto;
}

.markdown-renderer .katex-error {
  color: var(--md-katex-error-color);
  background: var(--md-katex-error-bg);
}
</style>
