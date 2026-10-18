export const getToken = () => localStorage.getItem('askmeeai_token');

export const setToken = (t: string | null) => {
  if (t) {
    localStorage.setItem('askmeeai_token', t);
  } else {
    localStorage.removeItem('askmeeai_token');
  }
};
