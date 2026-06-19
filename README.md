# 🌍 Carbon Footprint Tracker

A lightweight, interactive web application designed to help individuals monitor, calculate, and understand their daily carbon emissions. By entering metrics related to transportation, energy use, and lifestyle habits, users receive instant feedback on their environmental impact alongside actionable ways to reduce it.

## 🚀 Live Demo

👉 https://jvp07-star.github.io/Carbon_Footprint_Tracker/

## 📂 Project Structure
The repository consists of the following core files:
* **`index.html`** – The main landing page featuring the carbon footprint calculator interface and input forms.
* **`emissions.html`** – A dedicated dashboard to view broken-down emission results, historical logs, or visual charts.
* **`script.js`** – The core application logic handling mathematical formulas, user inputs, and local storage retention.

## ✨ Features
* **Multi-Category Tracking:** Calculate emissions from vehicle travel, public transport, electricity, and dietary habits.
* **Real-time Breakdown:** Instant data outputs displaying metric tons or kilograms of $CO_2$ equivalent ($CO_2e$) per year.
* **Responsive Dashboard:** View historical impact and summaries cleanly on mobile, tablet, or desktop browsers.
* **Zero Dependencies:** Written completely in native client-side languages for incredibly fast load speeds and performance.

## 🛠️ Built With
* **HTML5:** Semantic structure for user forms and dashboard views.
* **CSS3:** Clean, modern user interface themed with eco-friendly aesthetics.
* **JavaScript (ES6+):** Dynamic calculation formulas, domestic data parsing, and state updates.

## 💻 Getting Started

Follow these simple steps to run this project locally on your machine.

### Prerequisites
You do not need any local servers, runtime environments, or package managers installed. All you need is a modern web browser (e.g., Chrome, Edge, Firefox, or Safari).

### Installation & Execution
1. Clone this repository directly onto your desktop terminal:
   ```bash
   git clone https://github.com
   ```
2. Navigate into the project folder:
   ```bash
   cd Carbon_Footprint_Tracker
   ```
3. Launch the application by opening the home page file:
   ```bash
   # On macOS
   open index.html

   # On Windows
   start index.html
   ```

## 📝 Customizing the Math
To adjust the carbon coefficients or add new input tracking categories, navigate to `script.js` and modify the emission factor constants. Standard default values typically approximate:
* **Electricity:** `~0.4 kg CO2 per kWh`
* **Gasoline Vehicle:** `~2.3 kg CO2 per Liter` / `~8.9 kg CO2 per Gallon`

## 🤝 Contributing
Contributions are highly encouraged! Feel free to fork this project, fix layout bugs, or introduce data charting libraries (like Chart.js) to expand functionality.
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
