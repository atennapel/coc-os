import lib/type.p
import lib/desc.p
import lib/bool.p

def ListD : Type -> Desc = \t. Arg \b. if b Ret (Arg {t} \_. Rec Ret)
