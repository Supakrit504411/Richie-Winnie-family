import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json({ error: 'File and userId are required' }, { status: 400 });
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}/${randomUUID()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await getSupabaseServer().storage
      .from('submission-evidence')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = getSupabaseServer().storage
      .from('submission-evidence')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: data.path,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
