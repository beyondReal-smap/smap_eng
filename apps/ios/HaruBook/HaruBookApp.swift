import SwiftUI

@main
struct HaruBookApp: App {
    @State private var authState = AuthState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(authState)
                .preferredColorScheme(.light)
                .tint(.smapPrimary)
        }
    }
}

struct RootView: View {
    @Environment(AuthState.self) private var auth

    var body: some View {
        switch auth.phase {
        case .loading:
            SplashView()
                .task { await auth.bootstrap() }
        case .signedOut:
            LoginView()
        case .signedIn:
            HomeRouter()
        }
    }
}

private struct SplashView: View {
    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()
            VStack(spacing: 16) {
                ProgressView()
                Text("하루책")
                    .font(.smapTitle)
                    .foregroundStyle(Color.smapText)
            }
        }
    }
}
