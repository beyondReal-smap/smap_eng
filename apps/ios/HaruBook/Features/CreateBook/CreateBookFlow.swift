import SwiftUI

/// 책 생성 마법사 4단계의 컨테이너. 단계별 sub-view를 전환하며 progress bar로 위치를 표시한다.
struct CreateBookFlow: View {
    @State private var viewModel: CreateBookViewModel
    let onCreated: (Book) -> Void
    let onCancel: () -> Void

    init(profileId: Int, onCreated: @escaping (Book) -> Void, onCancel: @escaping () -> Void) {
        _viewModel = State(initialValue: CreateBookViewModel(profileId: profileId))
        self.onCreated = onCreated
        self.onCancel = onCancel
    }

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()
            VStack(spacing: 0) {
                progress

                Group {
                    switch viewModel.step {
                    case .genre:
                        GenrePickerStep { viewModel.selectGenre($0) }
                    case .level:
                        LevelPickerStep(
                            genre: viewModel.genre,
                            selected: viewModel.cefr,
                            onSelect: { viewModel.selectLevel($0) }
                        )
                    case .intake:
                        IntakeStep(viewModel: viewModel) {
                            Task { await viewModel.generate() }
                        }
                    case .generating:
                        GeneratingStep(viewModel: viewModel) { book in
                            onCreated(book)
                        }
                    }
                }
                .frame(maxHeight: .infinity)
            }
        }
        .navigationTitle("새 동화 만들기")
        .navigationBarTitleDisplayMode(.inline)
        // NavigationStack 시스템 백버튼과 닫기 버튼이 겹쳐 보이지 않도록 숨김.
        // 좌측엔 step 중간에만 "이전" 버튼을, 우측엔 항상 "닫기" 버튼을 둔다.
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                if viewModel.step != .genre && viewModel.step != .generating {
                    Button {
                        viewModel.goBack()
                    } label: {
                        Label("이전", systemImage: "chevron.backward")
                    }
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button("닫기") { onCancel() }
            }
        }
        .onChange(of: viewModel.createdBook) { _, book in
            if let book { onCreated(book) }
        }
    }

    private var progress: some View {
        let total: Double = 4
        let value: Double = Double(viewModel.step.rawValue + 1)
        return ProgressView(value: value, total: total)
            .tint(Color.smapPrimary)
            .padding(.horizontal, 20)
            .padding(.top, 8)
    }
}
