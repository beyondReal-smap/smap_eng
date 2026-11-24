import XCTest
@testable import HaruBook

/// Book 확장 필드 fail-soft 디코딩 + 읽기 위치 클램프.
final class BookAndProgressTests: XCTestCase {
    private func decodeBook(_ json: String) throws -> Book {
        let data = Data(json.utf8)
        return try JSONDecoder().decode(Book.self, from: data)
    }

    func testLegacyBookOmitsExtendedFields() throws {
        let book = try decodeBook(#"{"id":1,"profileId":2,"title":"T","age":7,"cefr":"A1"}"#)
        XCTAssertNil(book.genre)
        XCTAssertNil(book.alternateEnding)
        XCTAssertNil(book.funFacts)
        XCTAssertFalse(book.isNonFiction)
        XCTAssertNil(book.displayFunFacts)
    }

    func testNonFictionFunFactsAndAlternateEnding() throws {
        let json = """
        {"id":2,"profileId":2,"title":"Stars","age":8,"cefr":"A2",
         "genre":"non_fiction",
         "funFacts":[{"title":"The Sun","body":"가장 가까운 별이에요."}],
         "alternateEnding":{"labelA":"Stay","labelB":"Go","passagesA":[{"en":"A","ko":"가"}],"passagesB":[]},
         "endingAudioPathsA":["/audio/a.mp3"]}
        """
        let book = try decodeBook(json)
        XCTAssertTrue(book.isNonFiction)
        XCTAssertEqual(book.displayFunFacts?.first?.title, "The Sun")
        XCTAssertEqual(book.alternateEnding?.labelA, "Stay")
        XCTAssertEqual(book.endingAudioPathsA, ["/audio/a.mp3"])
    }

    func testAlternateEndingJsonStringFallback() throws {
        let json = """
        {"id":3,"profileId":2,"title":"Moon","age":7,"cefr":"A1",
         "alternateEnding":"{\\"labelA\\":\\"A\\",\\"labelB\\":\\"B\\",\\"passagesA\\":[],\\"passagesB\\":[]}"}
        """
        let book = try decodeBook(json)
        XCTAssertEqual(book.alternateEnding?.labelA, "A")
    }

    func testMalformedExtendedFieldsAreDropped() throws {
        let json = """
        {"id":4,"profileId":2,"title":"Broken","age":7,"cefr":"A1",
         "alternateEnding":123,"funFacts":"not-json","endingAudioPathsA":{}}
        """
        let book = try decodeBook(json)
        XCTAssertEqual(book.title, "Broken")
        XCTAssertNil(book.alternateEnding)
        XCTAssertNil(book.funFacts)
        XCTAssertNil(book.endingAudioPathsA)
    }

    func testClampProgressIndex() {
        XCTAssertEqual(ReaderViewModel.clampProgressIndex(nil, passageCount: 10), 0)
        XCTAssertEqual(ReaderViewModel.clampProgressIndex(4, passageCount: 0), 0)
        XCTAssertEqual(ReaderViewModel.clampProgressIndex(0, passageCount: 5), 0)
        XCTAssertEqual(ReaderViewModel.clampProgressIndex(4, passageCount: 5), 4)
        XCTAssertEqual(ReaderViewModel.clampProgressIndex(11, passageCount: 8), 7)
        XCTAssertEqual(ReaderViewModel.clampProgressIndex(-3, passageCount: 8), 0)
    }

    func testProgressKeyMatchesWebConvention() {
        XCTAssertEqual(ReaderViewModel.progressDefaultsKey(bookId: 42), "reader:progress:42")
    }
}
