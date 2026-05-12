# VinoVino

Luxury wine discovery app built with React Native + Expo. Swipe through curated wines, save favourites, and order by the bottle.

## Features

- **Swipe**: right to save to watchlist, left to skip, up to add to cart (with quantity picker; default 6 bottles).
- **Detail view**: tap a card to slide up a full detail sheet with tasting notes, grape, rating, and price. Drag down or hit X to dismiss.
- **Watchlist**: review saved wines and add them to the cart.
- **Cart**: adjust quantities, see line totals and a grand total.

## Design

- Background `#1a0a0f`, cards `#2a1018`, accent gold `#c9a96e`, text `#f0e6d3`
- Like button `#7ecfa0`, skip button `#c0607a`, borders `#5c2535`
- Generous corner radii, gold accents and italic serif touches for a premium feel.

## Stack

- Expo SDK 51 with expo-router (file-based routing)
- react-native-reanimated 3 + react-native-gesture-handler for swipe gestures
- Context API for watchlist and cart state

## Run

```bash
npm install
npm run start
```

Then open in Expo Go or an iOS/Android simulator.
