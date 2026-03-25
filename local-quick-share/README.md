# QuickShare - Local Network File Sharing

A premium, fast, and easy-to-use file sharing application for your local network (Wi-Fi). Similar to Quick Share and LocalSend, this allows you to share files from your PC to mobile (and vice-versa) simply by scanning a QR code.

## 🚀 Key Features

- **Local Network Focus**: Share files instantly over Wi-Fi without any external servers.
- **QR Code Support**: Scan a QR code on your mobile to instantly open the sharing link.
- **Mobile Optimized**: Responsive design that looks and works great on any device.
- **Premium UI**: Modern dark-mode interface with glassmorphism and smooth animations.
- **Drag & Drop**: Effortlessly upload files by dropping them into the browser.
- **Real-time Progress**: Track upload progress with visual bars.

## 🛠️ Prerequisites

- **Node.js**: Ensure you have Node.js installed on your machine.
- **Local Network**: Both devices (PC and Mobile) must be on the same Wi-Fi network.

## 📥 Getting Started

1.  **Open Terminal** in the `local-quick-share` folder.
2.  **Install Dependencies** (if not already installed):
    ```bash
    npm install
    ```
3.  **Start the Server**:
    ```bash
    node server.js
    ```
4.  **Access the App**:
    - On your PC: Open `http://localhost:3000` in your browser.
    - On your Mobile: Scan the **QR Code** displayed on the PC screen or enter the address shown in the terminal (e.g., `http://192.168.x.x:3000`).

## 📂 Project Structure

- `server.js`: Node.js Express server handling uploads and API logic.
- `public/`: Frontend files (HTML, CSS, JS).
- `uploads/`: Directory where your shared files are stored.

---
**Note**: This app is designed for local network use. Ensure your firewall allows connections on port 3000 if you encounter issues.
