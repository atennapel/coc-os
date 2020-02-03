def Bool = {t : *} -> t -> t -> t

def True : Bool = \{t} true false. true
def False : Bool = \{t} true false. false

def if : {t : *} -> Bool -> t -> t -> t = \{t} b. b {t}

def not : Bool -> Bool = \b. b {Bool} False True
def and : Bool -> Bool -> Bool = \a b. a {Bool} b False
def or : Bool -> Bool -> Bool = \a b. a {Bool} True b
