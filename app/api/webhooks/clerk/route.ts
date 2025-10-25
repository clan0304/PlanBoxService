// ============================================
// CLERK WEBHOOK - USER SYNC
// ============================================
// Syncs user data from Clerk to Supabase
// Triggers: user.created, user.updated, user.deleted

import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(req: Request) {
  // Get webhook secret from environment
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('❌ Missing CLERK_WEBHOOK_SECRET in environment variables');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // Verify required headers are present
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('❌ Missing svix headers');
    return new Response('Missing svix headers', { status: 400 });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create Svix instance with secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify webhook signature
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('❌ Error verifying webhook:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  // Handle webhook events
  const eventType = evt.type;
  console.log(`📥 Received webhook: ${eventType}`);

  // ============================================
  // USER CREATED
  // ============================================
  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    try {
      const { error } = await supabaseAdmin.from('users').insert({
        id: id,
        email: email_addresses[0]?.email_address || '',
        full_name: `${first_name || ''} ${last_name || ''}`.trim() || null,
        subscription_tier: 'free',
        subscription_status: 'active',
        first_signed_in_at: new Date().toISOString(),
        last_signed_in_at: new Date().toISOString(),
      });

      if (error) {
        console.error('❌ Error creating user in Supabase:', error);
        return new Response('Error creating user', { status: 500 });
      }

      console.log('✅ User created in Supabase:', id);
    } catch (error) {
      console.error('❌ Exception creating user:', error);
      return new Response('Error creating user', { status: 500 });
    }
  }

  // ============================================
  // USER UPDATED
  // ============================================
  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    try {
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          email: email_addresses[0]?.email_address || '',
          full_name: `${first_name || ''} ${last_name || ''}`.trim() || null,
          last_signed_in_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error updating user in Supabase:', error);
        // Don't return error - user might not exist yet
      } else {
        console.log('✅ User updated in Supabase:', id);
      }
    } catch (error) {
      console.error('❌ Exception updating user:', error);
    }
  }

  // ============================================
  // USER DELETED
  // ============================================
  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    if (!id) {
      console.error('❌ No user ID in delete event');
      return new Response('No user ID', { status: 400 });
    }

    try {
      const { error } = await supabaseAdmin.from('users').delete().eq('id', id);

      if (error) {
        console.error('❌ Error deleting user from Supabase:', error);
        return new Response('Error deleting user', { status: 500 });
      }

      console.log('✅ User deleted from Supabase:', id);
    } catch (error) {
      console.error('❌ Exception deleting user:', error);
      return new Response('Error deleting user', { status: 500 });
    }
  }

  return new Response('Webhook processed successfully', { status: 200 });
}
