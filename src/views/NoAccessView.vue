<template>
  <v-container class="pa-4" style="max-width: 560px">
    <h1 class="mb-4">
      <v-icon class="mr-2">mdi-lock-outline</v-icon>
      You Need Admin Access
    </h1>
    <p class="mb-6">This page is for gym admins. If you should have access, ask an admin to grant it on the access page.</p>
    <div class="d-flex flex-wrap ga-3">
      <v-btn color="primary" variant="elevated" to="/">Go home</v-btn>
      <v-btn variant="tonal" to="/profile">Your profile</v-btn>
    </div>
  </v-container>
</template>
