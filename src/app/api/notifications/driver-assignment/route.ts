import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendDriverPushNotification } from '@/lib/firebaseAdmin';

// In-memory deduplication cache: key = `${orderId}_${driverId}`, value = timestamp
const recentDispatches = new Map<string, number>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, driverId } = body;

    if (!orderId || !driverId) {
      return NextResponse.json(
        { error: 'Missing orderId or driverId' },
        { status: 400 }
      );
    }

    // Deduplication check: prevent multiple duplicate pushes within 10 seconds for the same order & driver
    const dedupeKey = `${orderId}_${driverId}`;
    const now = Date.now();
    const lastSent = recentDispatches.get(dedupeKey);
    if (lastSent && now - lastSent < 10000) {
      return NextResponse.json({
        success: true,
        message: 'Notification recently sent, deduplicated.',
      });
    }
    recentDispatches.set(dedupeKey, now);

    // Clean up old entries
    if (recentDispatches.size > 200) {
      for (const [k, v] of recentDispatches.entries()) {
        if (now - v > 30000) recentDispatches.delete(k);
      }
    }

    // 1. Fetch driver profile to get FCM token
    const { data: driver, error: driverError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, fcm_token')
      .eq('id', driverId)
      .maybeSingle();

    if (driverError || !driver) {
      console.error('Driver profile not found:', { driverId, driver, driverError });
      return NextResponse.json(
        { error: 'Driver profile not found', driverId, details: driverError?.message },
        { status: 404 }
      );
    }

    if (!driver.fcm_token) {
      console.log(`Driver ${driver.full_name} (${driver.id}) has no registered FCM token yet.`);
      return NextResponse.json({
        success: false,
        message: 'Driver does not have an active FCM push token',
      });
    }

    // 2. Fetch order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_name, delivery_address, items_price, delivery_fee, order_details')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // 3. Construct rich Arabic notification
    const title = `📦 طلب جديد مسند إليك! (#${order.id})`;
    const address = order.delivery_address || 'دمشق';
    const bodyText = `الزبون: ${order.customer_name} • ${address}\nأجرة التوصيل: ${Number(order.delivery_fee) || 0} ل.س`;

    // 4. Send FCM Push Notification
    const fcmMessageId = await sendDriverPushNotification({
      token: driver.fcm_token,
      title,
      body: bodyText,
      orderId: order.id,
    });

    console.log(`FCM notification successfully dispatched to driver ${driver.full_name} for order #${order.id}`);

    return NextResponse.json({
      success: true,
      messageId: fcmMessageId,
      driverName: driver.full_name,
    });
  } catch (error: any) {
    console.error('Failed to send driver assignment notification:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
