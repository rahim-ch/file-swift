// server/api/convert.ts
import { promises as fs } from 'fs';
import { resolve } from 'path';
import sharp, { FormatEnum } from 'sharp'; // Import FormatEnum explicitly
import { PDFDocument } from 'pdf-lib';
import ffmpeg, { FffmpegCommand } from 'fluent-ffmpeg';
import { H3Event } from 'h3';
import { Readable } from 'stream';

export default defineEventHandler(async (event: H3Event) => {
  try {
    // Read the multipart form data (file upload)
    const form = await readMultipartFormData(event) as { name: string; data: Buffer; filename?: string }[];
    if (!form) throw new Error('Form data is undefined');
    const file = form.find((f) => f.name === 'file');
    if (!file) throw new Error('No file uploaded');

    const fileBuffer = Buffer.from(file.data); // Ensure fileBuffer is a Buffer
    const fileName = file.filename || 'uploaded-file';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const query = getQuery(event) as Record<string, string | string[] | undefined>;
    const outputFormat = (query.format as string | undefined)?.toLowerCase() ?? 'png'; // Default to PNG with nullish coalescing

    if (process.env.NODE_ENV === 'development') {
      console.log('Processing file:', { fileName, fileExtension, outputFormat, bufferType: typeof fileBuffer, isBuffer: fileBuffer instanceof Buffer });
    }

    // Validate supported input formats
    const supportedInputFormats = ['jpg', 'jpeg', 'png', 'pdf', 'mp3', 'wav'];
    if (!supportedInputFormats.includes(fileExtension)) {
      throw new Error(`Unsupported input file format: ${fileExtension}. Supported formats: ${supportedInputFormats.join(', ')}`);
    }

    // Validate supported output formats
    const supportedOutputFormats = {
      image: ['jpg', 'jpeg', 'png'],
      pdf: ['pdf'],
      audio: ['mp3', 'wav'],
    };

    if (!supportedOutputFormats.image.includes(outputFormat) && 
        !supportedOutputFormats.pdf.includes(outputFormat) && 
        !supportedOutputFormats.audio.includes(outputFormat)) {
      throw new Error(`Unsupported output format: ${outputFormat} for input ${fileExtension}`);
    }

    let convertedBuffer: Buffer;

    if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Converting image:', { fileExtension, outputFormat });
      }
      const validSharpFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff'] as const;
      if (!validSharpFormats.includes(outputFormat as keyof typeof validSharpFormats)) {
        throw new Error(`Unsupported image output format: ${outputFormat}. Supported formats: ${validSharpFormats.join(', ')}`);
      }
      try {
        convertedBuffer = await sharp(fileBuffer)
          .toFormat(outputFormat === 'jpg' ? 'jpeg' : outputFormat as keyof typeof FormatEnum, { quality: 80 })
          .toBuffer();
        if (process.env.NODE_ENV === 'development') {
          console.log('Image conversion successful');
        }
      } catch (sharpError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Sharp conversion error:', sharpError);
        }
        throw new Error(`Image conversion failed: ${sharpError.message}`);
      }
    } else if (fileExtension === 'pdf') {
      // PDF handling
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pdfBytes = await pdfDoc.save();
      convertedBuffer = Buffer.from(pdfBytes);
    } else if (['mp3', 'wav'].includes(fileExtension)) {
      // Audio conversion using ffmpeg
      convertedBuffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        const readableStream = Readable.from(Buffer.from(fileBuffer)); // Convert Buffer to Readable stream
        (ffmpeg() as FffmpegCommand)
          .input(readableStream)
          .toFormat(outputFormat)
          .on('error', (err: Error) => reject(err))
          .on('data', (chunk: Buffer) => chunks.push(chunk)) // Collect actual data chunks
          .on('end', () => resolve(Buffer.concat(chunks)))
          .saveToFile('nul') // Use 'nul' for Windows, '/dev/null' for Unix-like systems
          .run();
      });
    } else {
      throw new Error(`Unsupported format combination: ${fileExtension} to ${outputFormat}`);
    }

    // Return the converted file as base64 for the client to download
    return {
      file: convertedBuffer.toString('base64'),
      type: getMimeType(fileExtension, outputFormat),
      name: `${fileName.split('.')[0]}.${outputFormat}`,
    };
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Conversion error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileExtension,
        outputFormat,
        fileName,
      });
    }
    let errorMessage = 'File conversion failed';
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    throw createError({
      statusCode: 500, // Internal server error for uncaught exceptions
      statusMessage: errorMessage,
    });
  }
});

// Helper function to get MIME type based on extension
function getMimeType(inputExtension: string, outputFormat: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    pdf: 'application/pdf',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
  };
  return mimeTypes[outputFormat] || 'application/octet-stream';
}