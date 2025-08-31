export default function TestScroll() {
  return (
    <>
      <header className="h-16 bg-blue-500 text-white flex items-center px-4">
        <h1>Test Header</h1>
      </header>
      <main>
        <section className="h-screen bg-gray-100 p-8">
          <h2 className="text-2xl">Section 1</h2>
          <p>This is the first section. Scroll down to see more.</p>
        </section>
        <section className="h-screen bg-gray-200 p-8">
          <h2 className="text-2xl">Section 2</h2>
          <p>This is the second section.</p>
        </section>
        <section className="h-screen bg-gray-300 p-8">
          <h2 className="text-2xl">Section 3</h2>
          <p>This is the third section.</p>
        </section>
      </main>
    </>
  )
}