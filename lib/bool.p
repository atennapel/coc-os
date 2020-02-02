def Bool = {t : *} -> t -> t -> t

def True : Bool = \t f. t
def False : Bool = \t f. f

def if : {t : *} -> Bool -> t -> t -> t = \b. b
