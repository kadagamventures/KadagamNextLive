export const login = (userData) => async (dispatch) => {
  try {
    const user = await adminAuthService.login({
      ident: userData.ident, // ✅ Ensure it correctly references "ident"
      password: userData.password,
    });

    dispatch({
      type: LOGIN_SUCCESS,
      payload: user,
    });
  } catch (error) {
    dispatch({
      type: LOGIN_FAIL,
      payload: error.message || "Login failed",
    });
  }
};

export const logout = () => (dispatch) => {
  adminAuthService.logout();
  dispatch({
    type: LOGOUT,
  });
};
