<script setup>
import { marked } from 'marked';
import guideMarkdown from '../../ADMIN_UI_USER_GUIDE.md?raw';
import { headingSlug } from '@/helpers/heading-slug.mjs';

marked.use({
  breaks: true,
  renderer: {
    heading({ tokens, depth }) {
      return `<h${depth} id="${headingSlug(this.parser.parseInline(tokens, this.parser.textRenderer))}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    }
  }
});

const htmlContent = marked.parse(guideMarkdown);
</script>

<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1><v-icon class="mr-2">mdi-book-open-page-variant</v-icon> User Guide</h1>
      </v-col>
    </v-row>

    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-file-document</v-icon>
        <span>Documentation</span>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-6">
        <div class="markdown-body" v-html="htmlContent"></div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style>
/* GitHub Flavored Markdown Styles */
.markdown-body {
  font-size: 16px;
  line-height: 1.6;
  color: rgb(var(--v-theme-on-surface));
  max-width: 1200px;
}

/* Headings */
.markdown-body h1 {
  font-size: 2em;
  font-weight: 600;
  padding-bottom: 0.3em;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  margin-top: 24px;
  margin-bottom: 16px;
}

.markdown-body h2 {
  font-size: 1.5em;
  font-weight: 600;
  padding-bottom: 0.3em;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  margin-top: 24px;
  margin-bottom: 16px;
}

.markdown-body h3 {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 24px;
  margin-bottom: 16px;
}

.markdown-body h4 {
  font-size: 1em;
  font-weight: 600;
  margin-top: 24px;
  margin-bottom: 16px;
}

/* Paragraphs */
.markdown-body p {
  margin-top: 0;
  margin-bottom: 16px;
}

/* Lists */
.markdown-body ul,
.markdown-body ol {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-body ul {
  list-style-type: disc;
}

.markdown-body ol {
  list-style-type: decimal;
}

.markdown-body li {
  margin-top: 0.25em;
}

.markdown-body li + li {
  margin-top: 0.25em;
}

.markdown-body ul ul,
.markdown-body ul ol,
.markdown-body ol ol,
.markdown-body ol ul {
  margin-top: 0;
  margin-bottom: 0;
}

/* Code */
.markdown-body code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 3px;
  font-family: 'Courier New', Courier, monospace;
  color: rgb(var(--v-theme-on-surface));
}

.markdown-body pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 3px;
  margin-bottom: 16px;
}

.markdown-body pre code {
  display: inline;
  padding: 0;
  margin: 0;
  overflow: visible;
  line-height: inherit;
  word-wrap: normal;
  background-color: transparent;
  border: 0;
}

/* Blockquotes */
.markdown-body blockquote {
  padding: 0 1em;
  color: rgba(var(--v-theme-on-surface), 0.6);
  border-left: 0.25em solid rgba(var(--v-theme-on-surface), 0.2);
  margin-bottom: 16px;
}

/* Tables */
.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}

.markdown-body table th,
.markdown-body table td {
  padding: 6px 13px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
}

.markdown-body table th {
  font-weight: 600;
  background-color: rgba(var(--v-theme-on-surface), 0.05);
}

.markdown-body table tr:nth-child(even) {
  background-color: rgba(var(--v-theme-on-surface), 0.05);
}

/* Horizontal Rule */
.markdown-body hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: rgba(var(--v-theme-on-surface), 0.2);
  border: 0;
}

/* Links */
.markdown-body a {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.markdown-body a:hover {
  text-decoration: underline;
}

/* Text Styles */
.markdown-body strong {
  font-weight: 600;
}

.markdown-body em {
  font-style: italic;
}
</style>
