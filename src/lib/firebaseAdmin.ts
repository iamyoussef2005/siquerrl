import { getApps, initializeApp, cert, getApp, App } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';

function getFirebaseAdmin(): App | null {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccountKeyRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKeyRaw) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not defined in environment variables');
    return null;
  }

  try {
    let serviceAccount: any;
    const trimmed = serviceAccountKeyRaw.trim();
    if (trimmed.startsWith('{')) {
      serviceAccount = JSON.parse(trimmed);
    } else {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    }

    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    return null;
  }
}

export async function sendDriverPushNotification({
  token,
  title,
  body,
  orderId,
}: {
  token: string;
  title: string;
  body: string;
  orderId: number | string;
}) {
  const app = getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin SDK is not configured');
  }

  const messaging = getMessaging(app);

  const message: Message = {
    token,
    notification: {
      title,
      body,
    },
    data: {
      order_id: String(orderId),
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'high_importance_channel',
        sound: 'default',
        priority: 'high',
        defaultVibrateTimings: true,
        visibility: 'public',
      },
    },
  };

  const response = await messaging.send(message);
  return response;
}
