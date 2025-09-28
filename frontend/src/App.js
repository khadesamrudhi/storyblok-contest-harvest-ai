import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded bg-gradient-to-r from-blue-600 to-purple-600 mr-2" />
            <span className="font-bold text-lg">ContentHarvest</span>
          </div>
          <nav className="hidden sm:flex items-center space-x-6 text-sm">
            <a href="#features" className="hover:text-blue-600">Features</a>
            <a href="#how-it-works" className="hover:text-blue-600">How it works</a>
            <a href="#contact" className="hover:text-blue-600">Contact</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-white">
          <div className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
                Turn web intel into content that wins
              </h1>
              <p className="mt-4 text-gray-600 text-lg">
                Track competitors, harvest assets, spot trends, and predict performance — all in one place.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#features" className="inline-block px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  Explore Features
                </a>
                <a href="#contact" className="inline-block px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50">
                  Get in touch
                </a>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-xl border border-gray-200 shadow-sm p-4 bg-white">
                <div className="h-40 rounded-md bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center text-blue-700 font-semibold">
                  Live analytics preview
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-2xl font-bold">15</div>
                    <div className="text-gray-500">Competitors</div>
                  </div>
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-2xl font-bold">2.8k</div>
                    <div className="text-gray-500">Assets</div>
                  </div>
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-2xl font-bold">156</div>
                    <div className="text-gray-500">Trends</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold mb-6">Why ContentHarvest</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl border border-gray-200 bg-white">
              <div className="font-semibold">Competitor Analysis</div>
              <p className="text-sm text-gray-600 mt-2">Monitor strategies and engagement to discover gaps you can own.</p>
            </div>
            <div className="p-5 rounded-xl border border-gray-200 bg-white">
              <div className="font-semibold">Asset Harvester</div>
              <p className="text-sm text-gray-600 mt-2">Collect, filter, and export the visuals that elevate your content.</p>
            </div>
            <div className="p-5 rounded-xl border border-gray-200 bg-white">
              <div className="font-semibold">Trend Analysis</div>
              <p className="text-sm text-gray-600 mt-2">Spot rising topics early and ride the wave, not the wake.</p>
            </div>
          </div>
        </section>

        <section id="contact" className="bg-white border-t border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-10">
            <h3 className="text-xl font-bold">Ready to get started?</h3>
            <p className="text-gray-600 mt-2">Drop us a line and we’ll get back within 1 business day.</p>
            <a href="mailto:hello@contentharvest.ai" className="inline-block mt-4 px-5 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              hello@contentharvest.ai
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-500">
          © {new Date().getFullYear()} ContentHarvest. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default App;
