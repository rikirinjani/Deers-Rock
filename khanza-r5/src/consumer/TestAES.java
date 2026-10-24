import AESsecurity.EnkripsiAES;
public class TestAES {
    public static void main(String[] args) {
        System.out.println("HOST: " + EnkripsiAES.decrypt(args[0]));
        System.out.println("PORT: " + EnkripsiAES.decrypt(args[1]));
        System.out.println("DATABASE: " + EnkripsiAES.decrypt(args[2]));
        System.out.println("USER: " + EnkripsiAES.decrypt(args[3]));
        System.out.println("PAS: " + EnkripsiAES.decrypt(args[4]));
    }
}
