<template>
  <div class="max-w-md mx-auto p-6 bg-white shadow-md rounded-lg">
    <h2 class="text-2xl font-semibold mb-4 text-center">Convert your files</h2>
    <div class="border-2 border-dashed border-gray-300 p-8 text-center rounded-lg mb-4 hover:border-blue-500 hover:bg-gray-50 transition-colors">
      <input type="file" class="hidden" id="file-upload" @change="handleFileUpload" />
      <label for="file-upload" class="cursor-pointer flex flex-col items-center">
        <svg class="w-8 h-8 mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span>Drop files here or click to upload</span>
        <p class="text-sm text-gray-500 mt-2">Supported formats: JPG, PNG, PDF, MP3, WAV</p>
      </label>
    </div>
    <div class="mb-4">
      <label class="block text-gray-700 mb-2">Convert to</label>
      <select v-model="selectedFormat" class="w-full p-2 border rounded">
        <option>JPG</option>
        <option>PNG</option>
        <option>PDF</option>
        <option>MP3</option>
        <option>WAV</option>
      </select>
    </div>
    <button 
      class="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors" 
      @click="convertFile" 
      :disabled="!uploadedFile"
    >
      Convert Now
    </button>
    <p v-if="conversionResult" class="mt-4 text-green-500">Conversion successful! <a :href="conversionResult.url" download>Download file</a></p>
    <p v-if="error" class="mt-4 text-red-500">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const uploadedFile = ref<File | null>(null);
const selectedFormat = ref('PNG'); // Default format
const conversionResult = ref<{ url: string } | null>(null);
const error = ref<string | null>(null);

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Uploaded file:', {
        name: file.name,
        type: file.type,
        size: file.size,
      });
    }
    uploadedFile.value = file;
    error.value = null; // Clear any previous errors
  }
};

const convertFile = async () => {
  if (!uploadedFile.value) {
    error.value = 'Please upload a file first';
    return;
  }

  const formData = new FormData();
  formData.append('file', uploadedFile.value);

  if (process.env.NODE_ENV === 'development') {
    console.log('Sending conversion request:', {
      format: selectedFormat.value.toLowerCase(),
      fileName: uploadedFile.value.name,
    });
  }

  try {
    const response = await $fetch('/api/convert', {
      method: 'POST',
      body: formData,
      query: { format: selectedFormat.value.toLowerCase() },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Conversion response:', response);
    }

    // Decode base64 and create a Blob (browser-compatible)
    const base64String = response.file;
    const binaryString = atob(base64String); // Decode base64 to binary string
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: response.type });
    const url = window.URL.createObjectURL(blob);
    conversionResult.value = { url };
    error.value = null;
  } catch (err: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Conversion error:', err);
    }
    error.value = err.data?.statusMessage || 'Conversion failed';
    conversionResult.value = null;
  }
};
</script>