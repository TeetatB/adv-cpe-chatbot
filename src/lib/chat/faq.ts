export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "track",
    question: "How do I track my order?",
    answer:
      "Open the app, go to the Orders tab, and select your active order to see real-time tracking and estimated arrival time.",
  },
  {
    id: "address",
    question: "How can I change my delivery address?",
    answer:
      "You can only change the address before the restaurant starts preparing the order. Go to your active order and tap Edit Address. If the option is not available, the order can no longer be modified.",
  },
  {
    id: "late",
    question: "What should I do if my order is late?",
    answer:
      "Check the live tracking in the app first. If the order is significantly delayed, create a support ticket in this chat.",
  },
  {
    id: "cancel",
    question: "How do I cancel an order?",
    answer:
      "You can cancel an order for free before the restaurant starts preparing it. Go to your active order and tap Cancel Order. After preparation starts, cancellation may not be possible.",
  },
  {
    id: "fees",
    question: "Why was I charged a service fee or delivery fee?",
    answer:
      "Service fees and delivery fees are shown clearly before you place the order. They help cover platform and delivery costs and may vary by location and order size.",
  },
  {
    id: "promo",
    question: "How do I apply a promo code?",
    answer:
      "On the checkout screen, tap Add Promo Code, enter the code, and apply it before placing the order. Promo codes cannot be added after the order is placed.",
  },
  {
    id: "tip",
    question: "Can I tip the courier?",
    answer:
      "Yes. You can add a tip during checkout or after the order is delivered through the order details page.",
  },
  {
    id: "support",
    question: "How do I contact support?",
    answer:
      "You can create a support ticket in this chat, or go to Help in the app menu.",
  },
  {
    id: "payment",
    question: "What payment methods are accepted?",
    answer:
      "We accept major credit and debit cards, and other local payment methods available in your region. You can manage payment methods in the Account section.",
  },
  {
    id: "profile",
    question: "How do I update my phone number or email?",
    answer:
      "Go to Account, then Profile, and edit your phone number or email address.",
  },
];

export const SUGGESTED_PROMPTS = [
  "How do I track my order?",
  "How do I cancel an order?",
  "My order is missing items",
  "How do I apply a promo code?",
];
