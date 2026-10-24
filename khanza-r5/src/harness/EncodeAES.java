import AESsecurity.EnkripsiAES;
public class EncodeAES {
    public static void main(String[] a) {
        for (String s : a) System.out.println(EnkripsiAES.encrypt(s));
    }
}
