const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Função para Bloquear/Desbloquear Usuário
exports.toggleUserStatus = functions.https.onCall(async (data, context) => {
  // Verificação de segurança: garanta que quem chama é admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Usuário não autenticado.",
    );
  }

  // Aqui você pode adicionar uma verificação extra se o context.auth.token.role === 'admin'

  const { uid, shouldBlock } = data; // shouldBlock deve ser true ou false

  try {
    // 1. Atualiza o status no Firebase Authentication (impede login)
    await admin.auth().updateUser(uid, {
      disabled: shouldBlock,
    });

    // 2. Atualiza o documento no Firestore (para refletir na UI)
    // Ajuste 'users' para o nome da sua coleção de usuários no Lume Cume
    await admin.firestore().collection("users").doc(uid).update({
      isBlocked: shouldBlock,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: `Usuário ${shouldBlock ? "bloqueado" : "desbloqueado"} com sucesso.`,
    };
  } catch (error) {
    console.error("Erro ao alterar status do usuário:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao atualizar status do usuário.",
    );
  }
});
