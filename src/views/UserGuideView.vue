<script setup>
import { ref, onMounted } from 'vue';
import { marked } from 'marked';


const markdownContent = ref('');
const htmlContent = ref('');
const isLoading = ref(true);
const errorMessage = ref(null);

const handleClick = (event) => {
  // Prevent all anchor navigation - just let users scroll manually
  let target = event.target;
  
  // Walk up to find if we clicked on an anchor
  while (target && target !== event.currentTarget) {
    if (target.tagName === 'A') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    target = target.parentElement;
  }
};

const fetchMarkdown = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  
  try {
    // Fetch from the public raw GitHub URL
    const response = await fetch('https://raw.githubusercontent.com/Warcraft-Gym/admin_frontend/Shibby_Dev/ADMIN_UI_USER_GUIDE.md');
    
    if (!response.ok) {
      throw new Error('Failed to load user guide');
    }
    
    markdownContent.value = await response.text();
    
    marked.use({ breaks: true });

    // Convert markdown to HTML
    htmlContent.value = marked.parse(markdownContent.value);
  } catch (error) {
    console.error('Error loading user guide:', error);
    errorMessage.value = 'Failed to load user guide. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchMarkdown();
});
</script>

<template>
  <v-overlay v-model="isLoading" class="align-center justify-center" persistent>
    <v-progress-circular indeterminate size="64"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1><v-icon class="mr-2">mdi-book-open-page-variant</v-icon> User Guide</h1>
      </v-col>
    </v-row>

    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      border="start"
      border-color="red"
      class="mb-4"
      closable
      @click:close="errorMessage = null"
    >
      {{ errorMessage }}
    </v-alert>

    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex justify-space-between align-center">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-file-document</v-icon>
          <span>Documentation</span>
        </div>
        <v-btn
          color="white"
          variant="elevated"
          prepend-icon="mdi-refresh"
          @click="fetchMarkdown"
        >
          Refresh
        </v-btn>
      </v-card-title>
      
      <v-divider></v-divider>
      
      <v-card-text class="pa-6">
        <div class="markdown-body" v-html="htmlContent" @click="handleClick"></div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style>
/* GitHub Flavored Markdown Styles */
.markdown-body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #24292e;
  max-width: 1200px;
}

/* Headings */
.markdown-body h1 {
  font-size: 2em;
  font-weight: 600;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
  margin-top: 24px;
  margin-bottom: 16px;
}

.markdown-body h2 {
  font-size: 1.5em;
  font-weight: 600;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
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
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-family: 'Courier New', Courier, monospace;
}

.markdown-body pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
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
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
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
  border: 1px solid #dfe2e5;
}

.markdown-body table th {
  font-weight: 600;
  background-color: #f6f8fa;
}

.markdown-body table tr:nth-child(even) {
  background-color: #f6f8fa;
}

/* Horizontal Rule */
.markdown-body hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #e1e4e8;
  border: 0;
}

/* Links */
.markdown-body a {
  color: #0366d6;
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
